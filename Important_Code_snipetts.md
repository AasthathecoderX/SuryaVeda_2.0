# SuryaVeda: IMP code snipetts

This file highlights the main code blocks that drive the project, so judges do not need to read every source file. The project flow is:

1. Estimate household electricity consumption and bill.
2. Predict rooftop solar generation from location, cloud cover, and system size.
3. Convert predictions into savings, payback, carbon impact, and coverage insights.
4. Save prediction history for logged-in users.

---

## 1. Backend Model Loading

**Source:** `backend/app.py`

```python
try:
    solar_model = joblib.load(os.path.join(BASE_DIR, 'solar_prediction_model.joblib'))
    solar_scaler = joblib.load(os.path.join(BASE_DIR, 'solar_scaler.joblib'))
    print("[OK] Solar model and scaler loaded.")
except Exception as e:
    print(f"[ERROR] Loading solar model/scaler: {e}")
    solar_model = None
    solar_scaler = None

try:
    electricity_model = joblib.load(os.path.join(BASE_DIR, 'electricity_prediction_model.joblib'))
    print("[OK] Electricity model loaded.")
except Exception as e:
    print(f"[ERROR] Loading electricity model: {e}")
    electricity_model = None
```

**Why this matters:**  
The Flask backend loads the trained ML models once when the server starts. The solar flow uses both a trained model and a scaler, while the electricity flow loads a separate model. Keeping these as global objects avoids reloading large model files on every API request.

---

## 2. Electricity Consumption Estimation

**Source:** `backend/app.py`  
**Function:** `estimate_monthly_kwh(features)`

```python
ELECTRICITY_KWH_PER_APPLIANCE_MONTH = {
    'fan': 23.0,
    'refrigerator': 45.0,
    'air_conditioner': 265.0,
    'television': 17.5,
    'monitor': 7.5,
    'motor_pump': 35.0,
}

SEASONAL_MULTIPLIER = {
    1: 0.85, 2: 0.85, 3: 0.90,
    4: 1.15, 5: 1.25, 6: 1.25,
    7: 1.10, 8: 1.05, 9: 1.00,
    10: 0.90, 11: 0.85, 12: 0.85,
}

def estimate_monthly_kwh(features):
    fan, refrigerator, air_conditioner, television, monitor, motor_pump, month, monthly_hours, tariff_rate = features

    appliance_counts = {
        'fan': fan,
        'refrigerator': refrigerator,
        'air_conditioner': air_conditioner,
        'television': television,
        'monitor': monitor,
        'motor_pump': motor_pump,
    }

    base_kwh = sum(
        count * ELECTRICITY_KWH_PER_APPLIANCE_MONTH[name]
        for name, count in appliance_counts.items()
    )

    usage_factor = monthly_hours / 720.0 if monthly_hours > 0 else 1.0
    season_factor = SEASONAL_MULTIPLIER.get(int(month), 1.0)

    monthly_kwh = base_kwh * usage_factor * season_factor
    return monthly_kwh
```

**Why this matters:**  
This converts simple user inputs, such as appliance counts and monthly usage hours, into an estimated monthly kWh value. It also adjusts for seasonal usage, especially higher cooling demand during Indian summer months. This makes the electricity feature usable for real households instead of requiring users to already know their kWh.

---

## 3. Electricity Prediction API

**Source:** `backend/app.py`  
**Route:** `POST /predict_electricity`  
**Function:** `predict_electricity()`

```python
@app.route('/predict_electricity', methods=['POST'])
def predict_electricity():
    data = request.get_json(force=True)
    features = [float(value) for value in data['features']]

    if len(features) != 9:
        return jsonify({'error': 'Expected 9 electricity features'}), 400

    fan, refrigerator, air_conditioner, television, monitor, motor_pump, month, monthly_hours, tariff_rate = features

    if tariff_rate <= 0:
        return jsonify({'error': 'Tariff rate must be greater than 0'}), 400

    estimated_kwh = estimate_monthly_kwh(features)
    MODEL_KWH_MIN, MODEL_KWH_MAX = 95, 926

    if electricity_model is not None and MODEL_KWH_MIN <= estimated_kwh <= MODEL_KWH_MAX * 1.2:
        try:
            model_features = [
                fan, refrigerator, air_conditioner, television,
                monitor, motor_pump, month, estimated_kwh, tariff_rate
            ]
            input_array = np.array(model_features).reshape(1, -1)
            ml_bill = float(electricity_model.predict(input_array)[0])

            expected_bill = estimated_kwh * tariff_rate
            if ml_bill <= 0 or ml_bill > expected_bill * 3 or ml_bill < expected_bill * 0.1:
                monthly_kwh = estimated_kwh
                bill_amount = expected_bill
                prediction_method = 'estimate'
            else:
                bill_amount = ml_bill
                monthly_kwh = bill_amount / tariff_rate
                prediction_method = 'ml_model'
        except Exception:
            monthly_kwh = estimated_kwh
            bill_amount = estimated_kwh * tariff_rate
            prediction_method = 'estimate'
    else:
        monthly_kwh = estimated_kwh
        bill_amount = estimated_kwh * tariff_rate
        prediction_method = 'estimate'

    result = {
        'prediction': round(bill_amount, 2),
        'consumption': round(monthly_kwh, 2),
        'unit': 'INR',
        'consumption_unit': 'kWh/month',
        'method': prediction_method,
    }

    return jsonify(result)
```

**Why this matters:**  
This is the main electricity intelligence route. It validates input, estimates monthly kWh, uses the ML model when the input is inside the model's reliable training range, and falls back to a formula-based estimate if the model output looks unrealistic. That fallback is important because it prevents bad predictions for unusual or low-usage households.

---

## 4. Solar Prediction API and Financial Impact

**Source:** `backend/app.py`  
**Route:** `POST /predict_solar`  
**Function:** `predict_solar()`

```python
@app.route('/predict_solar', methods=['POST'])
def predict_solar():
    data = request.get_json(force=True)

    input_features = np.array(data['features']).reshape(1, -1)
    tariff_rate = float(data.get('tariff_rate', 7))
    system_size = float(data.get('system_size', 1))
    cost_per_kw = float(data.get('cost_per_kw', data.get('system_cost', 60000)))
    total_system_cost = cost_per_kw * system_size

    if system_size <= 0:
        return jsonify({'error': 'System size must be greater than 0'}), 400

    input_features_scaled = input_features.copy()
    input_features_scaled[:, 0:3] = solar_scaler.transform(input_features[:, 0:3])

    prediction = solar_model.predict(input_features_scaled)
    irradiance = float(prediction[0])
    annual_kwh_per_kw = irradiance * 365 * 0.75
    annual_kwh = annual_kwh_per_kw * system_size

    annual_savings = annual_kwh * tariff_rate
    payback_period = total_system_cost / annual_savings if annual_savings > 0 else 0
    carbon_reduction = annual_kwh * 0.82
    trees_equivalent = carbon_reduction / 21

    result = {
        'prediction': round(annual_kwh, 2),
        'annual_kwh_per_kw': round(annual_kwh_per_kw, 2),
        'irradiance': round(irradiance, 2),
        'unit': 'kWh/year',
        'system_size': round(system_size, 2),
        'cost_per_kw': round(cost_per_kw, 2),
        'total_system_cost': round(total_system_cost, 2),
        'annual_savings': round(annual_savings, 2),
        'payback_period': round(payback_period, 2),
        'carbon_reduction': round(carbon_reduction, 2),
        'trees_equivalent': round(trees_equivalent, 1),
        'insight': (
            "Excellent ROI 🚀" if payback_period < 5 else
            "Moderate investment ⚖️" if payback_period < 8 else
            "Long-term investment 🌱"
        )
    }

    return jsonify(result)
```

**Why this matters:**  
This is the core rooftop solar suitability engine. It scales location/weather inputs, predicts solar irradiance, converts it into annual generation for the user's system size, and then calculates business-case outputs: annual savings, payback period, carbon reduction, and trees equivalent.

---

## 5. Saving Prediction History for Logged-In Users

**Source:** `backend/app.py`  
**Functions:** `save_prediction(...)`, authenticated save block inside prediction routes

```python
def save_prediction(user_id, pred_type, inputs, result):
    import json
    conn = get_db()
    conn.execute('INSERT INTO predictions (user_id, type, inputs, result) VALUES (?, ?, ?, ?)',
                 (user_id, pred_type, json.dumps(inputs), json.dumps(result)))
    conn.commit()
    conn.close()
```

```python
token = request.headers.get('Authorization', '').replace('Bearer ', '')
if token:
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        save_prediction(payload['user_id'], 'solar',
            {
                'features': data['features'],
                'tariff_rate': tariff_rate,
                'system_size': system_size,
                'cost_per_kw': cost_per_kw,
                'total_system_cost': total_system_cost,
            },
            result)
    except Exception:
        pass
```

**Why this matters:**  
Predictions can be run without login, but authenticated users get a persistent history in SQLite. This supports a personalized dashboard without forcing every visitor to create an account before trying the tool.

---

## 6. Frontend Electricity Form Calling the Backend

**Source:** `frontend/src/pages/Electricity.jsx`  
**Function:** `handlePredict()`

```javascript
const handlePredict = async () => {
  const validationErrors = validate();
  setErrors(validationErrors);
  if (Object.keys(validationErrors).length > 0) {
    addToast("Please fix the highlighted fields.", "error");
    return;
  }

  setLoading(true);
  setProgress(0);
  setEnergyConsumption("--");

  const fields = [
    fan, refrigerator, airConditioner, television,
    monitor, motorPump, month, monthlyHours, tariffRate
  ];

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/predict_electricity`, {
    method: "POST",
    headers,
    body: JSON.stringify({ features: fields.map(Number) }),
  });
  const data = await res.json();

  if (data.prediction !== undefined) {
    const bill = data.prediction;
    const consumption = data.consumption ?? bill / parseFloat(tariffRate);
    const method = data.method === "ml_model" ? "AI" : "Estimate";
    const result = `${consumption.toFixed(2)} kWh/month · ₹${bill.toFixed(2)}`;
    setEnergyConsumption(result);

    setHistory(prev => [
      { result, method, date: new Date().toLocaleString(), inputs: {
        fan, refrigerator, airConditioner, television,
        monitor, motorPump, month, monthlyHours, tariffRate
      }},
      ...prev
    ].slice(0, 10));
  }
};
```

**Why this matters:**  
This is the user-facing bridge between the form and the electricity model. It validates required fields, sends the 9-feature model input to Flask, displays both kWh and bill amount, and keeps recent predictions in browser storage for quick comparison.

---

## 7. Frontend Solar Form: Location, Zone Encoding, and Weather

**Source:** `frontend/src/pages/Solar.jsx`  
**Functions:** `detectZone(...)`, `handleDetect()`, `handlePredict()`

```javascript
const encodeZone = (zone) => {
  const map = {
    central:"CENTRAL ZONE",
    east:"EAST ZONE",
    north:"NORTH ZONE",
    south:"SOUTH ZONE",
    west:"WEST ZONE"
  };
  return map[zone.toLowerCase()] ?? "CENTRAL ZONE";
};

const detectZone = (lat, lng) => {
  if (lat > 28) return "North";
  if (lat < 15) return "South";
  if (lng > 85) return "East";
  if (lng < 75) return "West";
  return "Central";
};
```

```javascript
const handleDetect = async () => {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude.toFixed(4);
      const lng = position.coords.longitude.toFixed(4);
      setLatitude(lat);
      setLongitude(lng);
      setZone(detectZone(parseFloat(lat), parseFloat(lng)));

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=cloud_cover_mean&timezone=auto&forecast_days=7`
      );
      const data = await res.json();
      if (data.daily?.cloud_cover_mean) {
        const avgCloud = (
          data.daily.cloud_cover_mean.reduce((a, b) => a + b, 0) /
          data.daily.cloud_cover_mean.length
        ).toFixed(0);
        setCloudAmount(avgCloud);
      }
    }
  );
};
```

```javascript
const encodedZone = encodeZone(zone);
const features = [
  parseFloat(latitude),
  parseFloat(longitude),
  parseFloat(cloudAmount),
  encodedZone === "CENTRAL ZONE" ? 1 : 0,
  encodedZone === "EAST ZONE"    ? 1 : 0,
  encodedZone === "NORTH ZONE"   ? 1 : 0,
  encodedZone === "SOUTH ZONE"   ? 1 : 0,
  encodedZone === "WEST ZONE"    ? 1 : 0,
];

const res = await fetch(`${API_URL}/predict_solar`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    features,
    tariff_rate: parseFloat(tariffRate || 7),
    system_size: parseFloat(systemSize),
    cost_per_kw: parseFloat(costPerKw),
  }),
});
```

**Why this matters:**  
This is how the frontend converts real-world rooftop inputs into the model's expected feature vector. The app can use browser GPS and Open-Meteo cloud coverage, then one-hot encodes India's geographical zone before sending the request to the backend.

---

## 8. Passing Solar Results into the Insights Page

**Source:** `frontend/src/pages/Solar.jsx`  
**Function:** result handling inside `handlePredict()`

```javascript
const results = {
  solarGeneration: genValue,
  systemSize:      `${data.system_size} kW`,
  costPerKw:       `₹${data.cost_per_kw}/kW`,
  totalSystemCost: `₹${data.total_system_cost}`,
  annualSavings:   `₹${data.annual_savings}`,
  paybackPeriod:   `${data.payback_period} years`,
  carbonReduction: `${data.carbon_reduction} kg CO₂/yr`,
  treesEquivalent: `${data.trees_equivalent} trees`,
  insight:         data.insight || "",
};

setSolarResults(results);
```

**Why this matters:**  
This block packages the backend's solar prediction into presentation-ready metrics. It stores those metrics in shared React context, which lets the Insights page display financial and environmental analysis immediately after prediction.

---

## 9. Shared App State: Tariff and Solar Results

**Source:** `frontend/src/App.js`  
**Component:** `App()`

```javascript
const [solarResults, setSolarResults] = useState(() => {
  try {
    const saved = localStorage.getItem("sv_solar_results");
    return saved ? JSON.parse(saved) : {
      solarGeneration: "--",
      systemSize:      "--",
      costPerKw:       "--",
      totalSystemCost: "--",
      annualSavings:   "--",
      paybackPeriod:   "--",
      carbonReduction: "--",
      treesEquivalent: "--",
      insight:         "",
    };
  } catch {
    return {
      solarGeneration: "--",
      systemSize:      "--",
      costPerKw:       "--",
      totalSystemCost: "--",
      annualSavings:   "--",
      paybackPeriod:   "--",
      carbonReduction: "--",
      treesEquivalent: "--",
      insight:         "",
    };
  }
});

const [tariffRate, setTariffRate] = useState(() => localStorage.getItem("sv_tariff_rate") || "");

const updateSolarResults = useCallback((results) => {
  setSolarResults(results);
  localStorage.setItem("sv_solar_results", JSON.stringify(results));
}, []);

const updateTariffRate = useCallback((rate) => {
  setTariffRate(rate);
  localStorage.setItem("sv_tariff_rate", rate);
}, []);
```

**Why this matters:**  
This is the glue between pages. The tariff entered on the Electricity page automatically becomes available on the Solar page for savings calculations. Solar results persist across refreshes and feed the Insights page.

---

## 10. Insights: Comparing Solar Generation Against Household Demand

**Source:** `frontend/src/pages/Insights.jsx`  
**Component block:** Energy Comparison

```javascript
const elecHistory = JSON.parse(localStorage.getItem("elec_history") || "[]");
if (elecHistory.length === 0) return null;

const latest = elecHistory[0];
const elecMatch = latest.result.match(/([\d.]+)\s*kWh/);
const elecKwh = elecMatch ? parseFloat(elecMatch[1]) : null;
const solarMatch = solarGeneration.match(/([\d.]+)/);
const solarKwh = solarMatch ? parseFloat(solarMatch[1]) : null;

const monthlyConsumption = elecKwh || 0;
const annualConsumption = monthlyConsumption * 12;
const coverage = annualConsumption > 0 && solarKwh
  ? ((solarKwh / annualConsumption) * 100).toFixed(0)
  : null;
```

**Why this matters:**  
This combines the two major analysis flows. It takes the latest electricity result, annualizes household demand, compares it with predicted solar generation, and shows what percentage of the user's annual electricity needs can be covered by rooftop solar.

---

## 11. ROI / Payback Calculator

**Source:** `frontend/src/pages/RoiCalculator.jsx`  
**Function:** `calculate()`

```javascript
const cost = parseFloat(costPerKw) * parseFloat(systemSize);
const genKwh = parseFloat(annualGenerationPerKw) * parseFloat(systemSize);
const tariff = parseFloat(tariffRate);
const increase = parseFloat(annualIncrease) / 100;
const degrad = parseFloat(degradation) / 100;
const life = parseInt(systemLife);
const maintenance = parseFloat(maintenanceCost);

let cumulativeSavings = 0;
let paybackYear = null;
const yearlyData = [];

for (let year = 1; year <= life; year++) {
  const genThisYear = genKwh * Math.pow(1 - degrad, year - 1);
  const tariffThisYear = tariff * Math.pow(1 + increase, year - 1);
  const savingsThisYear = genThisYear * tariffThisYear - maintenance;
  cumulativeSavings += savingsThisYear;

  yearlyData.push({
    year,
    generation: Math.round(genThisYear),
    tariff: tariffThisYear.toFixed(2),
    savings: Math.round(savingsThisYear),
    cumulative: Math.round(cumulativeSavings),
    roi: (((cumulativeSavings - cost) / cost) * 100).toFixed(1),
  });

  if (!paybackYear && cumulativeSavings >= cost) {
    paybackYear = year;
  }
}

const totalSavings = cumulativeSavings;
const netProfit = totalSavings - cost;
const roi = ((netProfit / cost) * 100).toFixed(1);
```

**Why this matters:**  
This gives judges a clear financial model beyond a one-year savings estimate. It accounts for tariff inflation, panel degradation, maintenance cost, system life, cumulative payback, and long-term ROI.

---

## 12. Authentication and User Dashboard

**Source:** `frontend/src/context/AuthContext.js`  
**Functions:** `login(...)`, `signup(...)`, auth state provider

```javascript
const login = async (email, password) => {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  localStorage.setItem("sv_token", data.token);
  setToken(data.token);
  setUser(data.user);
  return data;
};

const getAuthHeader = () => token ? { Authorization: `Bearer ${token}` } : {};
```

**Source:** `backend/app.py`  
**Functions:** `generate_token(...)`, `token_required(...)`

```python
def generate_token(user_id, email):
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Token required'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user_id = data['user_id']
            request.user_email = data['email']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated
```

**Why this matters:**  
The project is not only a calculator. It supports accounts, JWT authentication, protected routes, and stored prediction history. This makes it closer to a usable product than a standalone ML demo.

---

## Recommended Demo Sequence for Judges

1. Open the Electricity page and enter appliances, month, hours, and tariff.
2. Show that the app returns both `kWh/month` and bill estimate.
3. Open the Solar page and use Auto-Detect or manually enter coordinates, cloud coverage, system size, and cost per kW.
4. Show annual solar generation, savings, payback, CO2 reduction, and tree equivalent.
5. Open Insights to show solar coverage versus household annual electricity demand.
6. Open ROI Calculator to show year-by-year return, degradation, tariff increase, and payback year.
7. Log in and show Dashboard prediction history.
