from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

# Allow React frontend to communicate with Flask
CORS(app, resources={r"/*": {"origins": "*"}})

# Find the folder where app.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# =========================================================
# LOAD ML MODEL
# =========================================================

model_path = os.path.join(BASE_DIR, "student_model.pkl")

try:
    model = joblib.load(model_path)
    print("ML model loaded successfully.")
except Exception as e:
    model = None
    print("ML model loading error:", e)


# =========================================================
# MYSQL DATABASE CONFIGURATION
# =========================================================

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "Student@123",
    "database": "student_performance",
    "port": 3306
}


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"],
            port=DB_CONFIG["port"]
        )

        return connection

    except Error as e:
        print("MySQL connection error:", e)
        return None


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Student Performance Prediction Backend is running!"
    })


# =========================================================
# DATABASE TEST
# =========================================================

@app.route("/database-test", methods=["GET"])
def database_test():

    connection = get_db_connection()

    if connection is None:
        return jsonify({
            "success": False,
            "message": "Unable to connect to MySQL database."
        }), 500

    try:
        cursor = connection.cursor()

        cursor.execute("SELECT DATABASE()")

        database_name = cursor.fetchone()[0]

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "MySQL database connected successfully!",
            "database": database_name
        })

    except Error as e:

        if connection:
            connection.close()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================================================
# PREDICTION + INSERT STUDENT
# =========================================================

@app.route("/predict", methods=["POST"])
def predict():

    connection = None
    cursor = None

    try:

        data = request.get_json() or {}

        # -------------------------------------------------
        # Student information
        # -------------------------------------------------

        name = str(data.get("name", "")).strip()
        roll_number = str(data.get("rollNumber", "")).strip()
        email = str(data.get("email", "")).strip()
        phone = str(data.get("phone", "")).strip()

        age = int(data.get("age", 0) or 0)

        department = str(data.get("department", "")).strip()

        semester = int(data.get("semester", 0) or 0)

        # -------------------------------------------------
        # ML input values
        # -------------------------------------------------

        attendance = float(data.get("attendance", 0) or 0)

        previous_marks = float(
            data.get("previousMarks", 0) or 0
        )

        assignment_marks = float(
            data.get("assignmentMarks", 0) or 0
        )

        internal_marks = float(
            data.get("internalMarks", 0) or 0
        )

        study_hours = float(
            data.get("studyHours", 0) or 0
        )

        completed_assignments = float(
            data.get("completedAssignments", 0) or 0
        )

        previous_failures = float(
            data.get("previousFailures", 0) or 0
        )

        # -------------------------------------------------
        # Validation
        # -------------------------------------------------

        if not name:
            return jsonify({
                "success": False,
                "error": "Student name is required."
            }), 400

        if not roll_number:
            return jsonify({
                "success": False,
                "error": "Roll number is required."
            }), 400

        # -------------------------------------------------
        # Check duplicate roll number
        # -------------------------------------------------

        connection = get_db_connection()

        if connection is None:
            return jsonify({
                "success": False,
                "error": "Unable to connect to MySQL database."
            }), 500

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM students
            WHERE roll_number = %s
            LIMIT 1
            """,
            (roll_number,)
        )

        existing_student = cursor.fetchone()

        if existing_student:

            cursor.close()
            connection.close()

            return jsonify({
                "success": False,
                "error": f"Student with roll number {roll_number} already exists."
            }), 409

        # -------------------------------------------------
        # Create ML input
        # -------------------------------------------------

        input_data = pd.DataFrame([{
            "attendance": attendance,
            "previousMarks": previous_marks,
            "assignmentMarks": assignment_marks,
            "internalMarks": internal_marks,
            "studyHours": study_hours,
            "completedAssignments": completed_assignments,
            "previousFailures": previous_failures
        }])

        # -------------------------------------------------
        # Prediction
        # -------------------------------------------------

        if model is None:
            raise Exception(
                "ML model could not be loaded. "
                "Make sure student_model.pkl exists."
            )

        predicted_marks = model.predict(input_data)[0]

        predicted_marks = round(float(predicted_marks), 2)

        # Keep marks between 0 and 100
        predicted_marks = max(
            0,
            min(100, predicted_marks)
        )

        # -------------------------------------------------
        # Performance + Risk
        # -------------------------------------------------

        if predicted_marks >= 75:

            performance = "Excellent"
            risk = "Low Risk"

        elif predicted_marks >= 60:

            performance = "Good"
            risk = "Medium Risk"

        elif predicted_marks >= 40:

            performance = "Average"
            risk = "Medium Risk"

        else:

            performance = "Needs Improvement"
            risk = "High Risk"

        # -------------------------------------------------
        # Insert student
        # -------------------------------------------------

        insert_query = """
            INSERT INTO students (
                name,
                roll_number,
                email,
                phone,
                age,
                department,
                semester,
                attendance,
                previous_marks,
                assignment_marks,
                internal_marks,
                study_hours,
                completed_assignments,
                previous_failures,
                predicted_marks,
                performance,
                risk
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s
            )
        """

        values = (
            name,
            roll_number,
            email,
            phone,
            age,
            department,
            semester,
            attendance,
            previous_marks,
            assignment_marks,
            internal_marks,
            study_hours,
            completed_assignments,
            previous_failures,
            predicted_marks,
            performance,
            risk
        )

        cursor.execute(insert_query, values)

        connection.commit()

        student_id = cursor.lastrowid

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "studentId": student_id,
            "predictedMarks": predicted_marks,
            "performance": performance,
            "risk": risk,
            "message": "Prediction completed and student saved to MySQL."
        })

    except Exception as e:

        print("Prediction error:", e)

        if connection:
            try:
                connection.rollback()
            except:
                pass

        if cursor:
            try:
                cursor.close()
            except:
                pass

        if connection:
            try:
                connection.close()
            except:
                pass

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# GET ALL STUDENTS
# =========================================================

@app.route("/students", methods=["GET"])
def get_students():

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:
            return jsonify({
                "success": False,
                "error": "Unable to connect to MySQL database."
            }), 500

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                name,
                roll_number,
                email,
                phone,
                age,
                department,
                semester,
                attendance,
                previous_marks,
                assignment_marks,
                internal_marks,
                study_hours,
                completed_assignments,
                previous_failures,
                predicted_marks,
                performance,
                risk,
                created_at
            FROM students
            ORDER BY id DESC
        """)

        students = cursor.fetchall()

        formatted_students = []

        for student in students:

            formatted_students.append({

                "id": student["id"],

                "name": student["name"],

                "rollNumber": student["roll_number"],

                "email": student["email"],

                "phone": student["phone"],

                "age": student["age"],

                "department": student["department"],

                "semester": student["semester"],

                "attendance": student["attendance"],

                "previousMarks": student["previous_marks"],

                "assignmentMarks": student["assignment_marks"],

                "internalMarks": student["internal_marks"],

                "studyHours": student["study_hours"],

                "completedAssignments":
                    student["completed_assignments"],

                "previousFailures":
                    student["previous_failures"],

                "predictedMarks":
                    student["predicted_marks"],

                "performance":
                    student["performance"],

                "risk":
                    student["risk"],

                "createdAt":
                    str(student["created_at"])
            })

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "students": formatted_students
        })

    except Exception as e:

        print("Get students error:", e)

        if cursor:
            try:
                cursor.close()
            except:
                pass

        if connection:
            try:
                connection.close()
            except:
                pass

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# UPDATE STUDENT
# =========================================================

@app.route("/students/<int:student_id>", methods=["PUT", "OPTIONS"])
def update_student(student_id):

    # Handle browser CORS preflight request
    if request.method == "OPTIONS":
        return jsonify({
            "success": True
        }), 200

    connection = None
    cursor = None

    try:

        data = request.get_json() or {}

        # -------------------------------------------------
        # Student information
        # -------------------------------------------------

        name = str(data.get("name", "")).strip()

        roll_number = str(
            data.get("rollNumber", "")
        ).strip()

        email = str(
            data.get("email", "")
        ).strip()

        phone = str(
            data.get("phone", "")
        ).strip()

        age = int(
            data.get("age", 0) or 0
        )

        department = str(
            data.get("department", "")
        ).strip()

        semester = int(
            data.get("semester", 0) or 0
        )

        # -------------------------------------------------
        # ML input values
        # -------------------------------------------------

        attendance = float(
            data.get("attendance", 0) or 0
        )

        previous_marks = float(
            data.get("previousMarks", 0) or 0
        )

        assignment_marks = float(
            data.get("assignmentMarks", 0) or 0
        )

        internal_marks = float(
            data.get("internalMarks", 0) or 0
        )

        study_hours = float(
            data.get("studyHours", 0) or 0
        )

        completed_assignments = float(
            data.get("completedAssignments", 0) or 0
        )

        previous_failures = float(
            data.get("previousFailures", 0) or 0
        )

        # -------------------------------------------------
        # Validation
        # -------------------------------------------------

        if not name:
            return jsonify({
                "success": False,
                "error": "Student name is required."
            }), 400

        if not roll_number:
            return jsonify({
                "success": False,
                "error": "Roll number is required."
            }), 400

        # -------------------------------------------------
        # Connect database
        # -------------------------------------------------

        connection = get_db_connection()

        if connection is None:
            return jsonify({
                "success": False,
                "error": "Unable to connect to MySQL database."
            }), 500

        cursor = connection.cursor()

        # -------------------------------------------------
        # Check duplicate roll number
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM students
            WHERE roll_number = %s
            AND id <> %s
            LIMIT 1
            """,
            (roll_number, student_id)
        )

        existing_student = cursor.fetchone()

        if existing_student:

            cursor.close()
            connection.close()

            return jsonify({
                "success": False,
                "error":
                    f"Student with roll number "
                    f"{roll_number} already exists."
            }), 409

        # -------------------------------------------------
        # Create ML input
        # -------------------------------------------------

        input_data = pd.DataFrame([{
            "attendance": attendance,
            "previousMarks": previous_marks,
            "assignmentMarks": assignment_marks,
            "internalMarks": internal_marks,
            "studyHours": study_hours,
            "completedAssignments": completed_assignments,
            "previousFailures": previous_failures
        }])

        # -------------------------------------------------
        # Recalculate prediction
        # -------------------------------------------------

        if model is None:
            raise Exception(
                "ML model could not be loaded."
            )

        predicted_marks = model.predict(input_data)[0]

        predicted_marks = round(
            float(predicted_marks),
            2
        )

        predicted_marks = max(
            0,
            min(100, predicted_marks)
        )

        # -------------------------------------------------
        # Performance + Risk
        # -------------------------------------------------

        if predicted_marks >= 75:

            performance = "Excellent"
            risk = "Low Risk"

        elif predicted_marks >= 60:

            performance = "Good"
            risk = "Medium Risk"

        elif predicted_marks >= 40:

            performance = "Average"
            risk = "Medium Risk"

        else:

            performance = "Needs Improvement"
            risk = "High Risk"

        # -------------------------------------------------
        # Update database
        # -------------------------------------------------

        update_query = """
            UPDATE students
            SET
                name = %s,
                roll_number = %s,
                email = %s,
                phone = %s,
                age = %s,
                department = %s,
                semester = %s,
                attendance = %s,
                previous_marks = %s,
                assignment_marks = %s,
                internal_marks = %s,
                study_hours = %s,
                completed_assignments = %s,
                previous_failures = %s,
                predicted_marks = %s,
                performance = %s,
                risk = %s
            WHERE id = %s
        """

        values = (
            name,
            roll_number,
            email,
            phone,
            age,
            department,
            semester,
            attendance,
            previous_marks,
            assignment_marks,
            internal_marks,
            study_hours,
            completed_assignments,
            previous_failures,
            predicted_marks,
            performance,
            risk,
            student_id
        )

        cursor.execute(
            update_query,
            values
        )

        if cursor.rowcount == 0:

            cursor.close()
            connection.close()

            return jsonify({
                "success": False,
                "error": "Student not found."
            }), 404

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "studentId": student_id,
            "predictedMarks": predicted_marks,
            "performance": performance,
            "risk": risk,
            "message": "Student updated successfully."
        })

    except Exception as e:

        print("Update student error:", e)

        if connection:
            try:
                connection.rollback()
            except:
                pass

        if cursor:
            try:
                cursor.close()
            except:
                pass

        if connection:
            try:
                connection.close()
            except:
                pass

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# DELETE ONE STUDENT
# =========================================================

@app.route("/students/<int:student_id>", methods=["DELETE", "OPTIONS"])
def delete_student(student_id):

    if request.method == "OPTIONS":
        return jsonify({
            "success": True
        }), 200

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:
            return jsonify({
                "success": False,
                "error": "Unable to connect to MySQL database."
            }), 500

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM students
            WHERE id = %s
            """,
            (student_id,)
        )

        if cursor.rowcount == 0:

            cursor.close()
            connection.close()

            return jsonify({
                "success": False,
                "error": "Student not found."
            }), 404

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "Student deleted successfully."
        })

    except Exception as e:

        print("Delete student error:", e)

        if connection:
            try:
                connection.rollback()
            except:
                pass

        if cursor:
            try:
                cursor.close()
            except:
                pass

        if connection:
            try:
                connection.close()
            except:
                pass

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# DELETE ALL STUDENTS
# =========================================================

@app.route("/students", methods=["DELETE", "OPTIONS"])
def delete_all_students():

    if request.method == "OPTIONS":
        return jsonify({
            "success": True
        }), 200

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        if connection is None:
            return jsonify({
                "success": False,
                "error": "Unable to connect to MySQL database."
            }), 500

        cursor = connection.cursor()

        cursor.execute(
            "DELETE FROM students"
        )

        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({
            "success": True,
            "message": "All students deleted successfully."
        })

    except Exception as e:

        print("Delete all students error:", e)

        if connection:
            try:
                connection.rollback()
            except:
                pass

        if cursor:
            try:
                cursor.close()
            except:
                pass

        if connection:
            try:
                connection.close()
            except:
                pass

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# RUN FLASK
# =========================================================

if __name__ == "__main__":

    print("")
    print("==============================================")
    print(" Student Performance Prediction Backend")
    print("==============================================")
    print("Server: http://127.0.0.1:5000")
    print("")

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )