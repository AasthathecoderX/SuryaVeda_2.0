# SuryaVeda — Complete Project Guide

Everything you need to understand this project from scratch.

---

## What is SuryaVeda?

SuryaVeda is a web app that helps Indian households answer two questions:
1. **How much electricity am I using?** (and what's my bill?)
2. **If I install solar panels, how much energy will they generate?** (and is it worth the investment?)

It uses machine learning models trained on real Indian energy data to give predictions, not just rough guesses.

---

## Architecture (How it's Built)

```
┌─────────────────────┐        HTTP        ┌─────────────────────┐
│                     │  ◄──────────────►  │                     │
│   React Frontend    │    JSON API calls   │   Flask Backend     │
│   (Port 3000)       │                    │   (Port 5000)       │
│                     │                    │                     │
│  - Pages/Forms      │                    │  - ML Models        │
│  - Charts/Insights  │                    │  - Auth (JWT)       │
│  - Theme/Toast      │                    │  - SQLite DB        │
│                     │                    │                     │
└─────────────────────┘                    └─────────────────────┘
         │                                          │
         │                                          │
    localStorage                              .joblib files
    (history, theme,                          (trained models)
     solar results)
```

**Frontend** = What the user sees and interacts with (React)
**Backend** = The brain that runs predictions and stores data (Python/Flask)

They talk to each other over HTTP — the frontend sends form data, the backend returns predictions.

---

## The ML Models — What They Do

### 1. Electricity Model (XGBoost)

- **File:** `backend/electricity_prediction_model.joblib`
- **Type:** XGBoost Regressor (a tree-based ML algorithm)
- **Trained on:** 45,345 rows of Indian household electricity data
- **Input:** Appliance counts, month, energy consumption (kWh), tariff rate
- **Output:** Predicted electricity bill (₹)

**How it works in the app:**
1. User enters appliance counts and usage hours
2. Backend calculates estimated kWh using a formula (appliances × standard consumption × usage factor × seasonal adjustment)
3. That estimated kWh is fed to the ML model as a feature
4. Model predicts the bill amount, accounting for non-linear patterns it learned from real data
5. If usage is too low (below model's training range of 95–926 kWh), we skip the model and use the formula directly

**Why both formula AND model?**
The model was trained on data ranging from 95 to 926 kWh/month. For a single person with 1 fan and no AC (~20 kWh), the model would give garbage predictions because it's never seen such low values. The formula handles those cases.

**Evaluation metrics from the checked-in dataset:**

| Metric | Electricity bill | Derived monthly kWh |
|--------|------------------|---------------------|
| Rows evaluated | 45,345 | 45,345 |
| MAE | ₹7.96 | 0.95 kWh |
| RMSE | ₹13.09 | 1.57 kWh |
| R² | 0.9999 | 0.9998 |
| MAPE | 0.21% | 0.21% |

---

### 2. Solar Model (Gradient Boosting)

- **File:** `backend/solar_prediction_model.joblib`
- **Type:** scikit-learn Gradient Boosting Regressor
- **Trained on:** Indian solar irradiance data across geographic zones
- **Input:** Latitude, Longitude, Cloud Coverage %, Zone (one-hot encoded)
- **Output:** Daily solar irradiance (kWh/m²/day)

**How it works in the app:**
1. User enters location + cloud coverage + system size
2. Backend scales lat/long/cloud using a pre-trained scaler (`solar_scaler.joblib`)
3. Model predicts daily irradiance
4. Backend calculates: `Annual kWh = Irradiance × 365 × 0.75 (efficiency) × System Size`
5. Then derives savings, payback period, carbon reduction etc.

**Evaluation metrics from the checked-in dataset:**

| Metric | Daily irradiance | Derived annual kWh/kW |
|--------|------------------|-----------------------|
| Rows evaluated | 387 | 387 |
| MAE | 0.065 kWh/m²/day | 17.76 kWh/year |
| RMSE | 0.085 kWh/m²/day | 23.20 kWh/year |
| R² | 0.948 | 0.948 |
| MAPE | 1.33% | 1.33% |

Note: The repository does not include the original training/evaluation split, so these are saved-model-vs-project-dataset metrics. For a formal technical report, retrain with a documented holdout or cross-validation split.

---

## What Each Input Field Means

### Electricity Page

| Field | What it means |
|-------|---------------|
| **Fans (count)** | Number of ceiling/table fans in your home |
| **Refrigerators** | Number of fridges (usually 1) |
| **Air Conditioners** | Number of ACs (biggest power consumer!) |
| **Televisions** | Number of TVs |
| **Monitors** | Computer/laptop monitors |
| **Motor Pumps** | Water pumps (common in Indian homes with overhead tanks) |
| **Month (1–12)** | Which month you want the prediction for. Matters because summer = more AC/fan usage |
| **Monthly Hours of Usage** | Total hours per month your appliances run. Think of it as: average daily hours × 30. If your appliances run ~10 hours/day = 300 hours/month |
| **Tariff Rate (₹/kWh)** | How much your electricity company charges per unit. Check your bill — usually ₹5–10 for residential in India |

### Solar Page

| Field | What it means |
|-------|---------------|
| **Latitude / Longitude** | Your location coordinates. Use "Auto-Detect" or find on Google Maps |
| **Cloud Coverage (%)** | Average cloud cover. 0% = always sunny, 100% = always cloudy. Most Indian cities are 20–40% |
| **System Size (kW)** | How many kilowatts of solar panels you'd install. A typical home uses 3–5 kW. 1 kW ≈ 3 panels on your roof |
| **System Cost (₹/kW)** | Price per kW of installation (panels + inverter + wiring + labor). In India 2024-26: ₹45,000–70,000/kW depending on quality |
| **Geographical Zone** | Which part of India you're in. Affects sunlight hours and intensity |
| **Tariff Rate** | Auto-filled from the Electricity page. Used to calculate how much money solar saves you |

### ROI Calculator

| Field | What it means |
|-------|---------------|
| **Annual Generation (kWh/kW/year)** | How much energy 1 kW of panels generates per year in your area. Typically 1200–1600 kWh in India. Get this from your Solar prediction result |
| **Annual Tariff Increase (%)** | How much electricity prices go up each year. In India, ~5% average |
| **Panel Degradation (%/year)** | Solar panels lose a tiny bit of efficiency each year. Industry standard: 0.5%/year |
| **System Lifetime (years)** | How long panels last. Usually 25 years (warranty period) |
| **Annual Maintenance (₹)** | Yearly cleaning + minor repairs. ₹1,500–3,000 typical |

---

## Behind-the-Scenes Workflow

### When you click "Predict Electricity":

```
[User fills form] 
    → Frontend validates inputs
    → Sends POST /predict_electricity with features array
    → Backend receives [fan, fridge, ac, tv, monitor, pump, month, hours, tariff]
    → Calculates estimated kWh:
        base = sum(appliance × standard kWh/month)
        adjusted = base × (hours/720) × seasonal_multiplier
    → If estimated kWh is in model's range (95–926):
        → Feed [appliances..., month, estimated_kWh, tariff] to XGBoost
        → Model returns predicted bill
        → Sanity check: is prediction reasonable? (within 0.1x–3x of formula)
        → If yes → return ML prediction
        → If no → return formula estimate
    → If outside range → return formula estimate
    → Response includes: bill (₹), consumption (kWh), method used
    → If user is logged in → save to database
    → Frontend displays result + saves to local history
```

### When you click "Predict Solar":

```
[User fills form or uses Auto-Detect]
    → Frontend validates (lat, lng, cloud, size, cost)
    → Encodes zone as one-hot: [Central, East, North, South, West]
    → Sends POST /predict_solar with features + tariff + size + cost
    → Backend scales first 3 features (lat, lng, cloud) using StandardScaler
    → Gradient Boosting model predicts daily irradiance
    → Backend calculates:
        annual_kwh = irradiance × 365 × 0.75 × system_size
        annual_savings = annual_kwh × tariff
        payback = total_cost / annual_savings
        carbon_reduction = annual_kwh × 0.82 (India's grid emission factor)
        trees = carbon_reduction / 21 (kg CO₂ per tree per year)
    → Returns full result object
    → Frontend stores in AppContext (persisted to localStorage)
    → Insights page reads from this shared state
```

### When you open Insights:

```
[Checks AppContext for solar results]
    → If no solar prediction yet → shows "Run prediction first" message
    → If results exist → displays financial + environmental cards
    → Also checks localStorage for electricity history
    → If both exist → calculates solar coverage percentage:
        coverage = (solar_annual_kWh / (electricity_monthly_kWh × 12)) × 100%
```

### Authentication Flow:

```
Signup:
    → POST /api/signup {name, email, password}
    → Backend hashes password with bcrypt
    → Stores in SQLite users table
    → Returns JWT token (valid 7 days)
    → Frontend stores token in localStorage

Login:
    → POST /api/login {email, password}
    → Backend verifies password hash
    → Returns fresh JWT token

Protected routes:
    → Frontend sends token in Authorization header
    → Backend decorator verifies + decodes JWT
    → If valid → proceeds; if expired/invalid → 401 error
```

---

## Key Numbers & Formulas

| Constant | Value | Source |
|----------|-------|--------|
| Fan consumption | 23 kWh/month | Industry average (75W × 10h/day) |
| Refrigerator | 45 kWh/month | BEE 3-star rated |
| Air Conditioner | 265 kWh/month | 1.5 ton, 8h/day |
| Television | 17.5 kWh/month | LED TV, 6h/day |
| Monitor | 7.5 kWh/month | 24" LCD, 5h/day |
| Motor Pump | 35 kWh/month | 0.5 HP, 2h/day |
| Solar efficiency factor | 0.75 | Accounts for inverter loss, dust, temperature |
| India grid emission factor | 0.82 kg CO₂/kWh | CEA 2023 report |
| CO₂ absorbed per tree | 21 kg/year | USDA Forest Service estimate |

### Seasonal Multipliers (Electricity):
| Month | Multiplier | Why |
|-------|-----------|-----|
| Jan–Feb | 0.85 | Winter, less AC/fan |
| Mar | 0.90 | Transitional |
| Apr–Jun | 1.15–1.25 | Peak summer, AC running all day |
| Jul–Aug | 1.05–1.10 | Monsoon, humid but less extreme |
| Sep | 1.00 | Baseline |
| Oct–Dec | 0.85–0.90 | Post-monsoon, winter approaching |

---

## Folder Structure Explained

```
SuryaVeda/
├── frontend/                  # React app (what users see)
│   ├── src/
│   │   ├── pages/             # One file per page/route
│   │   ├── components/        # Reusable UI pieces
│   │   │   ├── common/        # InputField, ResultCard, Toast, etc.
│   │   │   └── layout/        # Navbar
│   │   ├── context/           # Shared state (React Context API)
│   │   │   ├── AppContext.js  # Solar results, tariff, toasts
│   │   │   ├── AuthContext.js # User login state
│   │   │   └── ThemeContext.js# Dark/light mode
│   │   └── config/api.js      # Backend URL configuration
│   └── package.json
│
├── backend/                   # Python Flask API
│   ├── app.py                 # ALL backend logic in one file
│   ├── *.joblib               # Pre-trained ML models (binary)
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Template for secrets
│
├── Datasets/                  # Training data (CSVs, not used at runtime)
├── SAMPLE_INPUTS.md           # Test scenarios with expected outputs
└── README.md                  # Setup instructions
```

---

## Common Questions

**Q: Why does "Monthly Hours" affect the prediction so much?**
A: It scales all appliance consumption. If you say 150 hours (5h/day), your appliances run 20% of the time. If you say 500 hours (16h/day), they run 70% of the time. This is the biggest lever.

**Q: What if the ML model isn't loaded?**
A: The app still works! It falls back to the formula-based estimate. You'll see `method: "estimate"` in the response instead of `method: "ml_model"`.

**Q: Why do I need to go to Electricity page before Solar?**
A: You don't *have* to, but the tariff rate you enter on the Electricity page auto-fills on the Solar page. If you skip it, solar calculations use a default of ₹7/kWh.

**Q: What does "System Size" mean in real terms?**
A: 1 kW of solar ≈ 3 panels on your roof ≈ covers ~60 sq ft. A 5kW system = 15 panels = 300 sq ft of roof space. Generates enough for a typical 3BHK family.

**Q: How accurate are the predictions?**
A: The electricity model was tested against its training data and gets within ~1% for typical households (95–926 kWh range). For solar, accuracy depends on how representative the cloud coverage value is — actual generation varies ±15% year-to-year due to weather.

**Q: What's the difference between Insights and ROI Calculator?**
A: **Insights** shows quick results from your last solar prediction (savings, payback, carbon). **ROI Calculator** lets you model long-term returns with advanced parameters like tariff inflation, panel degradation, and maintenance costs over 25 years.

---

## Tech Decisions & Why

| Decision | Why |
|----------|-----|
| XGBoost for electricity | Best performance on tabular data with mixed feature types |
| Gradient Boosting for solar | Handles the non-linear relationship between location/cloud and irradiance well |
| Flask (not FastAPI) | Simple, single-file server; no async needed for ML inference |
| SQLite (not PostgreSQL) | Zero config, file-based, perfect for single-server deployment |
| localStorage for history | Instant access, works offline, no login required for basic use |
| JWT (not sessions) | Stateless auth — backend doesn't need to track active sessions |
| React Context (not Redux) | Small app, few shared states; Redux would be overkill |
| CSS Variables + glass morphism | Modern look without heavy CSS framework dependency |
