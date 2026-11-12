from flask import Flask, request, jsonify
from sklearn.linear_model import LinearRegression
import numpy as np

app = Flask(__name__)
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "AI service is running",
        "engine": "Scikit-Learn LinearRegression"
    })


@app.route("/forecast", methods=["POST"])
def forecast():
    
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    sales = data.get("sales", [])

    if len(sales) < 2:
        return jsonify({
            "error": "At least 2 sales records are required"
        }), 400

    try:
        y = np.array(sales, dtype=float)

        # Sales periods: 1, 2, 3, ... (relationship between time and sales quantity)
        X = np.arange(1, len(y) + 1).reshape(-1, 1)

        model = LinearRegression()
        model.fit(X, y)

        # Predict next period: len(y) + 1
        next_period = np.array([[len(y) + 1]])
        prediction = model.predict(next_period)[0]
        prediction = max(0.0, float(prediction))

        slope = float(model.coef_[0])
        intercept = float(model.intercept_)
        r_squared = float(model.score(X, y))

        trend = "INCREASING" if slope > 0.05 else ("DECREASING" if slope < -0.05 else "STABLE")
        average_sales = float(np.mean(y))

        return jsonify({
            "predictedDemand": round(prediction, 2),
            "averageSales": round(average_sales, 2),
            "periodsUsed": len(sales),
            "trend": trend,
            "slope": round(slope, 3),
            "intercept": round(intercept, 3),
            "rSquared": round(r_squared, 3)
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )