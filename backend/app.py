from flask import Flask, request, jsonify
import joblib
import numpy as np
from flask_cors import CORS
import sqlite3
import bcrypt
import jwt
import datetime
import os
from functools import wraps
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

app = Flask(__name__)
CORS(app)

_secret = os.environ.get('SECRET_KEY')
if not _secret:
    import warnings
    warnings.warn("SECRET_KEY not set in environment! Using insecure dev key. Set SECRET_KEY in .env before deploying.")
    _secret = 'suryaveda-dev-secret-key-2024'
app.config['SECRET_KEY'] = _secret

# ── Database Setup ─────────────────────────────────────────────────────────────
DB_PATH = os.path.join(BASE_DIR, 'suryaveda.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            inputs TEXT NOT NULL,
            result TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ''')
    conn.commit()
    conn.close()

init_db()

# ── Auth Helpers ───────────────────────────────────────────────────────────────
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

# ── Auth Routes ────────────────────────────────────────────────────────────────
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json(force=True)
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not name or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db()
    try:
        conn.execute('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
                     (name, email, password_hash))
        conn.commit()
        user = conn.execute('SELECT id, name, email FROM users WHERE email = ?', (email,)).fetchone()
        token = generate_token(user['id'], user['email'])
        return jsonify({'token': token, 'user': {'id': user['id'], 'name': user['name'], 'email': user['email']}})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already registered'}), 409
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_token(user['id'], user['email'])
    return jsonify({'token': token, 'user': {'id': user['id'], 'name': user['name'], 'email': user['email']}})

@app.route('/api/me', methods=['GET'])
@token_required
def get_me():
    conn = get_db()
    user = conn.execute('SELECT id, name, email, created_at FROM users WHERE id = ?', (request.user_id,)).fetchone()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': dict(user)})

# ── Prediction History Routes ──────────────────────────────────────────────────
@app.route('/api/predictions', methods=['GET'])
@token_required
def get_predictions():
    pred_type = request.args.get('type')
    conn = get_db()
    if pred_type:
        rows = conn.execute(
            'SELECT * FROM predictions WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 50',
            (request.user_id, pred_type)).fetchall()
    else:
        rows = conn.execute(
            'SELECT * FROM predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            (request.user_id,)).fetchall()
    conn.close()
    return jsonify({'predictions': [dict(r) for r in rows]})

def save_prediction(user_id, pred_type, inputs, result):
    import json
    conn = get_db()
    conn.execute('INSERT INTO predictions (user_id, type, inputs, result) VALUES (?, ?, ?, ?)',
                 (user_id, pred_type, json.dumps(inputs), json.dumps(result)))
    conn.commit()
    conn.close()

# Load models AND scaler globally
# Compatibility shim: models were pickled with scikit-learn 1.6.x which used
# a top-level '_loss' module; newer versions moved it to sklearn._loss._loss
import sys
try:
    import sklearn._loss._loss as _loss_compat
    sys.modules.setdefault('_loss', _loss_compat)
except ImportError:
    pass

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

ELECTRICITY_KWH_PER_APPLIANCE_MONTH = {
    'fan': 23.0,
    'refrigerator': 45.0,
    'air_conditioner': 265.0,
    'television': 17.5,
    'monitor': 7.5,
    'motor_pump': 35.0,
}

# Seasonal multipliers: summer months (Apr-Jun) boost AC/fan usage
SEASONAL_MULTIPLIER = {
    1: 0.85, 2: 0.85, 3: 0.90,
    4: 1.15, 5: 1.25, 6: 1.25,
    7: 1.10, 8: 1.05, 9: 1.00,
    10: 0.90, 11: 0.85, 12: 0.85,
}


def estimate_monthly_kwh(features):
    """
    Estimate monthly kWh consumption from appliance counts and usage hours.
    
    The ML model's 'MonthlyHours' feature is actually monthly kWh consumption
    (dataset confirms: Bill = MonthlyHours × TariffRate for all rows).
    This function bridges user-friendly inputs to the model's expected format.
    """
    fan, refrigerator, air_conditioner, television, monitor, motor_pump, month, monthly_hours, tariff_rate = features

    appliance_counts = {
        'fan': fan,
        'refrigerator': refrigerator,
        'air_conditioner': air_conditioner,
        'television': television,
        'monitor': monitor,
        'motor_pump': motor_pump,
    }

    # Base consumption from appliance counts (assumes standard daily usage)
    base_kwh = sum(
        count * ELECTRICITY_KWH_PER_APPLIANCE_MONTH[name]
        for name, count in appliance_counts.items()
    )

    # Scale by actual usage hours vs baseline (720h = 24h × 30 days max theoretical)
    # If user says 300 hours, that's ~10h/day average across all appliances
    usage_factor = monthly_hours / 720.0 if monthly_hours > 0 else 1.0
    
    # Apply seasonal adjustment
    season_factor = SEASONAL_MULTIPLIER.get(int(month), 1.0)

    monthly_kwh = base_kwh * usage_factor * season_factor
    return monthly_kwh


@app.route('/')
def home():
    return "Solar & Electricity ML API Running!"


@app.route('/predict_solar', methods=['POST'])
def predict_solar():
    try:
        if solar_model is None or solar_scaler is None:
            return jsonify({'error': 'Solar model or scaler not loaded'}), 500
            
        data = request.get_json(force=True)
        print("Received solar data:", data)
        
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

        # Save to DB if user is authenticated
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

        return jsonify(result)
        
    except Exception as e:
        print("[ERROR] Solar prediction error:", e)
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
@app.route('/predict_electricity', methods=['POST'])
def predict_electricity():
    try:
        data = request.get_json(force=True)
        features = [float(value) for value in data['features']]
        
        if len(features) != 9:
            return jsonify({'error': 'Expected 9 electricity features'}), 400

        fan, refrigerator, air_conditioner, television, monitor, motor_pump, month, monthly_hours, tariff_rate = features

        if tariff_rate <= 0:
            return jsonify({'error': 'Tariff rate must be greater than 0'}), 400

        # Step 1: Estimate monthly kWh from user inputs
        estimated_kwh = estimate_monthly_kwh(features)

        # Step 2: Use ML model with estimated kWh as the 'MonthlyHours' feature
        # (In the training data, MonthlyHours IS the monthly kWh consumption)
        # Model's training range: kWh 95–926, tariff 7.4–9.3
        MODEL_KWH_MIN, MODEL_KWH_MAX = 95, 926

        if electricity_model is not None and MODEL_KWH_MIN <= estimated_kwh <= MODEL_KWH_MAX * 1.2:
            try:
                # Build model input: replace user's "monthly_hours" with computed kWh
                model_features = [fan, refrigerator, air_conditioner, television, 
                                  monitor, motor_pump, month, estimated_kwh, tariff_rate]
                input_array = np.array(model_features).reshape(1, -1)
                ml_bill = float(electricity_model.predict(input_array)[0])

                # Sanity check: ML bill should be positive and within reasonable bounds
                expected_bill = estimated_kwh * tariff_rate
                if ml_bill <= 0 or ml_bill > expected_bill * 3 or ml_bill < expected_bill * 0.1:
                    monthly_kwh = estimated_kwh
                    bill_amount = expected_bill
                    prediction_method = 'estimate'
                else:
                    bill_amount = ml_bill
                    monthly_kwh = bill_amount / tariff_rate
                    prediction_method = 'ml_model'
            except Exception as ml_err:
                print(f"[WARN] ML model failed, falling back to estimate: {ml_err}")
                monthly_kwh = estimated_kwh
                bill_amount = estimated_kwh * tariff_rate
                prediction_method = 'estimate'
        else:
            # Outside model's training range — use formula-based estimate
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

        # Save to DB if user is authenticated
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if token:
            try:
                payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                save_prediction(payload['user_id'], 'electricity',
                    {'features': features}, result)
            except Exception:
                pass

        return jsonify(result)
        
    except Exception as e:
        print("[ERROR] Electricity prediction error:", e)
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/debug_models', methods=['GET'])
@token_required
def debug_models():
    """Debug endpoint to check model info"""
    solar_info = {}
    elec_info = {}
    
    if solar_model is not None:
        try:
            solar_info['type'] = str(type(solar_model))
            solar_info['n_features'] = solar_model.n_features_in_
            
            # Test prediction with Bangalore coordinates
            test_input = np.array([[12.9716, 77.5946, 30, 0, 0, 0, 1, 0]])  # South zone
            test_scaled = test_input.copy()
            test_scaled[:, 0:3] = solar_scaler.transform(test_input[:, 0:3])
            
            test_pred = solar_model.predict(test_scaled)
            irradiance = float(test_pred[0])
            annual_kwh = irradiance * 365 * 0.75
            
            solar_info['test_irradiance'] = round(irradiance, 2)
            solar_info['test_annual_kwh'] = round(annual_kwh, 0)
            solar_info['expected_range'] = '1200-1500 kWh/year'
        except Exception as e:
            solar_info['error'] = str(e)
            import traceback
            solar_info['traceback'] = traceback.format_exc()
    else:
        solar_info['status'] = 'Model not loaded'
    
    if electricity_model is not None:
        try:
            elec_info['type'] = str(type(electricity_model))
            elec_info['n_features'] = electricity_model.n_features_in_
            
            # Test prediction
            test_input = np.array([[3, 1, 0, 2, 1, 1, 11, 200, 7]])
            test_pred = electricity_model.predict(test_input)
            bill = float(test_pred[0])
            consumption = bill / 7  # Divide by tariff rate
            
            elec_info['test_bill'] = round(bill, 2)
            elec_info['test_consumption'] = round(consumption, 2)
        except Exception as e:
            elec_info['error'] = str(e)
            import traceback
            elec_info['traceback'] = traceback.format_exc()
    else:
        elec_info['status'] = 'Model not loaded'
    
    return jsonify({
        'solar_model': solar_info,
        'electricity_model': elec_info
    })


if __name__ == '__main__':
    app.run(debug=True)
