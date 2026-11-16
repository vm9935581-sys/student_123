import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

function Dashboard({ students = [] }) {
  const getNumber = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== "") {
        const number = Number(value);
        if (!Number.isNaN(number)) return number;
      }
    }
    return 0;
  };

  const getMarks = (student) =>
    getNumber(student.predictedMarks, student.predicted_marks);

  const getAttendance = (student) =>
    getNumber(student.attendance);

  const getStudyHours = (student) =>
    getNumber(student.studyHours, student.study_hours);

  const getCompletedAssignments = (student) =>
    getNumber(
      student.completedAssignments,
      student.completed_assignments
    );

  const getPreviousFailures = (student) =>
    getNumber(
      student.previousFailures,
      student.previous_failures
    );

  const getRisk = (student) =>
    String(student.risk || "").toLowerCase().trim();

  const getPerformance = (student) => {
    const performance = String(
      student.performance || ""
    ).toLowerCase().trim();

    if (performance) return performance;

    const marks = getMarks(student);

    if (marks >= 80) return "excellent";
    if (marks >= 60) return "good";
    if (marks >= 40) return "average";
    return "needs improvement";
  };

  const totalStudents = students.length;

  const totalMarks = students.reduce(
    (sum, student) => sum + getMarks(student),
    0
  );

  const averageMarks =
    totalStudents > 0 ? totalMarks / totalStudents : 0;

  const passedStudents = students.filter(
    (student) => getMarks(student) >= 40
  ).length;

  const passPercentage =
    totalStudents > 0
      ? (passedStudents / totalStudents) * 100
      : 0;

  const averageAttendance =
    totalStudents > 0
      ? students.reduce(
          (sum, student) => sum + getAttendance(student),
          0
        ) / totalStudents
      : 0;

  const averageStudyHours =
    totalStudents > 0
      ? students.reduce(
          (sum, student) => sum + getStudyHours(student),
          0
        ) / totalStudents
      : 0;

  const highRisk = students.filter((student) =>
    getRisk(student).includes("high")
  ).length;

  const mediumRisk = students.filter((student) =>
    getRisk(student).includes("medium")
  ).length;

  const lowRisk = students.filter((student) =>
    getRisk(student).includes("low")
  ).length;

  const earlyWarning = students.filter(
    (student) =>
      getRisk(student).includes("high") ||
      getMarks(student) < 40 ||
      getPreviousFailures(student) >= 2
  ).length;

  const excellent = students.filter(
    (student) => getPerformance(student) === "excellent"
  ).length;

  const good = students.filter(
    (student) => getPerformance(student) === "good"
  ).length;

  const average = students.filter(
    (student) => getPerformance(student) === "average"
  ).length;

  const needsImprovement = students.filter((student) => {
    const performance = getPerformance(student);
    return (
      performance.includes("improvement") ||
      getMarks(student) < 40
    );
  }).length;

  const performanceData = [
    { name: "Excellent", students: excellent },
    { name: "Good", students: good },
    { name: "Average", students: average },
    {
      name: "Needs Improvement",
      students: needsImprovement,
    },
  ];

  const riskData = [
    { name: "Low Risk", value: lowRisk },
    { name: "Medium Risk", value: mediumRisk },
    { name: "High Risk", value: highRisk },
  ];

  const departmentMap = {};

  students.forEach((student) => {
    const department =
      String(student.department || "Unknown").trim() ||
      "Unknown";

    if (!departmentMap[department]) {
      departmentMap[department] = {
        total: 0,
        marks: 0,
      };
    }

    departmentMap[department].total += 1;
    departmentMap[department].marks += getMarks(student);
  });

  const departmentData = Object.entries(departmentMap)
    .map(([department, data]) => ({
      department,
      averageMarks:
        data.total > 0 ? data.marks / data.total : 0,
    }))
    .sort((a, b) => b.averageMarks - a.averageMarks);

  const topStudents = [...students]
    .sort((a, b) => getMarks(b) - getMarks(a))
    .slice(0, 5);

  const improvementStudents = [...students]
    .filter(
      (student) =>
        getMarks(student) < 60 ||
        getRisk(student).includes("medium") ||
        getRisk(student).includes("high")
    )
    .sort((a, b) => getMarks(a) - getMarks(b))
    .slice(0, 5);

  const attendanceStudyData = students.map((student) => ({
    attendance: getAttendance(student),
    marks: getMarks(student),
    studyHours: getStudyHours(student),
    name: student.name || "Student",
  }));

  // ==================================================
  // ADVANCED DASHBOARD STATISTICS
  // ==================================================
  const sortedMarks = students
    .map((student) => getMarks(student))
    .sort((a, b) => a - b);

  const medianMarks =
    sortedMarks.length === 0
      ? 0
      : sortedMarks.length % 2 === 1
      ? sortedMarks[Math.floor(sortedMarks.length / 2)]
      : (
          sortedMarks[sortedMarks.length / 2 - 1] +
          sortedMarks[sortedMarks.length / 2]
        ) / 2;

  const highestMarks =
    totalStudents > 0 ? Math.max(...sortedMarks) : 0;

  const lowestMarks =
    totalStudents > 0 ? Math.min(...sortedMarks) : 0;

  const averageAssignments =
    totalStudents > 0
      ? students.reduce(
          (sum, student) =>
            sum + getCompletedAssignments(student),
          0
        ) / totalStudents
      : 0;

  const averageFailures =
    totalStudents > 0
      ? students.reduce(
          (sum, student) => sum + getPreviousFailures(student),
          0
        ) / totalStudents
      : 0;

  const lowAttendanceStudents = students.filter(
    (student) => getAttendance(student) < 75
  ).length;

  const strongStudents = students.filter(
    (student) => getMarks(student) >= 80
  ).length;

  const improvementRate =
    totalStudents > 0
      ? ((totalStudents - strongStudents) / totalStudents) * 100
      : 0;

  const riskPercentage =
    totalStudents > 0
      ? ((highRisk + mediumRisk) / totalStudents) * 100
      : 0;

  const departmentCount = Object.keys(departmentMap).length;

  const highestDepartment =
    departmentData.length > 0 ? departmentData[0] : null;

  const getRiskBadge = (student) => {
    const risk = getRisk(student);

    if (risk.includes("high")) {
      return "bg-danger";
    }

    if (risk.includes("medium")) {
      return "bg-warning text-dark";
    }

    return "bg-success";
  };

  const getPerformanceBadge = (student) => {
    const marks = getMarks(student);

    if (marks >= 80) return "bg-success";
    if (marks >= 60) return "bg-primary";
    if (marks >= 40) return "bg-warning text-dark";
    return "bg-danger";
  };

  if (totalStudents === 0) {
    return (
      <div className="container py-5">
        <div className="card shadow-sm border-0">
          <div className="card-body text-center py-5">
            <div style={{ fontSize: "55px" }}>📊</div>

            <h2 className="fw-bold mt-3">
              Student Performance Dashboard
            </h2>

            <p className="text-muted mb-0">
              No student records are available yet.
              Add students from the Student Prediction page
              to view analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            📊 Student Performance Dashboard
          </h2>

          <p className="text-muted mb-0">
            Overall academic performance, risk analysis,
            and student insights
          </p>
        </div>

        <div className="badge bg-dark fs-6 px-3 py-2">
          {totalStudents} Student
          {totalStudents !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ==================================================
          KPI CARDS
      ================================================== */}

      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted">
                👨‍🎓 Total Students
              </div>
              <h2 className="fw-bold mb-0 mt-2">
                {totalStudents}
              </h2>
              <small className="text-muted">
                Records in MySQL
              </small>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted">
                🎯 Average Predicted Marks
              </div>
              <h2 className="fw-bold mb-0 mt-2">
                {averageMarks.toFixed(2)}
              </h2>
              <small className="text-muted">
                Out of 100
              </small>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted">
                ✅ Pass Percentage
              </div>
              <h2 className="fw-bold mb-0 mt-2">
                {passPercentage.toFixed(1)}%
              </h2>
              <small className="text-muted">
                Marks ≥ 40
              </small>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted">
                ⚠️ Early Warning
              </div>
              <h2 className="fw-bold mb-0 mt-2">
                {earlyWarning}
              </h2>
              <small className="text-muted">
                Students needing attention
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          ACADEMIC FACTORS
      ================================================== */}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">
                📅 Average Attendance
              </div>
              <h3 className="fw-bold mt-2 mb-0">
                {averageAttendance.toFixed(1)}%
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">
                📚 Average Study Hours
              </div>
              <h3 className="fw-bold mt-2 mb-0">
                {averageStudyHours.toFixed(1)}
              </h3>
              <small className="text-muted">
                Hours per day
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">
                🚨 High Risk Students
              </div>
              <h3 className="fw-bold mt-2 mb-0 text-danger">
                {highRisk}
              </h3>
              <small className="text-muted">
                Require immediate attention
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          ADVANCED DASHBOARD STATISTICS
      ================================================== */}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-secondary text-white">
          <h5 className="mb-0">📊 Advanced Dashboard Statistics</h5>
        </div>

        <div className="card-body">
          <div className="row g-3">
            <div className="col-xl-3 col-md-6">
              <div className="border rounded p-3 h-100 bg-light">
                <div className="text-muted">📐 Median Marks</div>
                <h4 className="fw-bold mt-2 mb-0">{medianMarks.toFixed(2)}</h4>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="border rounded p-3 h-100 bg-light">
                <div className="text-muted">🏆 Highest Marks</div>
                <h4 className="fw-bold mt-2 mb-0">{highestMarks.toFixed(2)}</h4>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="border rounded p-3 h-100 bg-light">
                <div className="text-muted">📉 Lowest Marks</div>
                <h4 className="fw-bold mt-2 mb-0">{lowestMarks.toFixed(2)}</h4>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="border rounded p-3 h-100 bg-light">
                <div className="text-muted">🏫 Departments</div>
                <h4 className="fw-bold mt-2 mb-0">{departmentCount}</h4>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="border rounded p-3 h-100">
                <div className="text-muted">📝 Avg. Completed Assignments</div>
                <h4 className="fw-bold mt-2 mb-0">{averageAssignments.toFixed(1)}</h4>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="border rounded p-3 h-100">
                <div className="text-muted">❌ Avg. Previous Failures</div>
                <h4 className="fw-bold mt-2 mb-0">{averageFailures.toFixed(1)}</h4>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="border rounded p-3 h-100">
                <div className="text-muted">📅 Attendance Below 75%</div>
                <h4 className="fw-bold mt-2 mb-0 text-warning">{lowAttendanceStudents}</h4>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="border rounded p-3 h-100">
                <div className="text-muted">⚠️ Medium/High Risk %</div>
                <h4 className="fw-bold mt-2 mb-0 text-danger">{riskPercentage.toFixed(1)}%</h4>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          <div className="row g-3">
            <div className="col-md-4">
              <div className="alert alert-success mb-0 h-100">
                <strong>Strong Performers:</strong><br />
                {strongStudents} student{strongStudents !== 1 ? "s" : ""} scored 80 or above.
              </div>
            </div>

            <div className="col-md-4">
              <div className="alert alert-warning mb-0 h-100">
                <strong>Improvement Group:</strong><br />
                {improvementRate.toFixed(1)}% of students are below 80 marks.
              </div>
            </div>

            <div className="col-md-4">
              <div className="alert alert-info mb-0 h-100">
                <strong>Top Department:</strong><br />
                {highestDepartment
                  ? `${highestDepartment.department} (${highestDepartment.averageMarks.toFixed(2)} avg)`
                  : "No department data"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          RISK SUMMARY
      ================================================== */}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-dark text-white">
          <h5 className="mb-0">
            ⚠️ Risk Summary
          </h5>
        </div>

        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="alert alert-success mb-0 text-center">
                <h4 className="fw-bold">
                  {lowRisk}
                </h4>
                <div>Low Risk</div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="alert alert-warning mb-0 text-center">
                <h4 className="fw-bold">
                  {mediumRisk}
                </h4>
                <div>Medium Risk</div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="alert alert-danger mb-0 text-center">
                <h4 className="fw-bold">
                  {highRisk}
                </h4>
                <div>High Risk</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          PERFORMANCE + RISK CHARTS
      ================================================== */}

      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                📈 Performance Distribution
              </h5>
            </div>

            <div className="card-body">
              <div style={{ width: "100%", height: 330 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="students"
                      name="Students"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-danger text-white">
              <h5 className="mb-0">
                ⚠️ Risk Distribution
              </h5>
            </div>

            <div className="card-body">
              <div style={{ width: "100%", height: 330 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      label
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`risk-${index}`} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          DEPARTMENT PERFORMANCE
      ================================================== */}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">
            🏫 Department-wise Average Performance
          </h5>
        </div>

        <div className="card-body">
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="averageMarks"
                  name="Average Marks"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ==================================================
          ATTENDANCE VS MARKS
      ================================================== */}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-info text-dark">
          <h5 className="mb-0">
            🔎 Attendance vs Predicted Marks
          </h5>
        </div>

        <div className="card-body">
          <p className="text-muted">
            This chart helps visualize the relationship
            between attendance and predicted performance.
          </p>

          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="attendance"
                  name="Attendance"
                  unit="%"
                  domain={[0, 100]}
                />
                <YAxis
                  type="number"
                  dataKey="marks"
                  name="Predicted Marks"
                  domain={[0, 100]}
                />
                <ZAxis
                  type="number"
                  dataKey="studyHours"
                  range={[60, 180]}
                  name="Study Hours"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                />
                <Legend />
                <Scatter
                  name="Students"
                  data={attendanceStudyData}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ==================================================
          TOP STUDENTS + IMPROVEMENT
      ================================================== */}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                🏆 Top Performing Students
              </h5>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Marks</th>
                      <th>Performance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topStudents.map((student, index) => (
                      <tr key={student.id || index}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>
                            {student.name || "-"}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`badge ${getPerformanceBadge(
                              student
                            )}`}
                          >
                            {getMarks(student).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          {student.performance || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-warning">
              <h5 className="mb-0">
                🚨 Students Needing Improvement
              </h5>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Marks</th>
                      <th>Risk</th>
                    </tr>
                  </thead>

                  <tbody>
                    {improvementStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center text-success py-4"
                        >
                          🎉 No students currently need
                          improvement.
                        </td>
                      </tr>
                    ) : (
                      improvementStudents.map(
                        (student, index) => (
                          <tr
                            key={
                              student.id || index
                            }
                          >
                            <td>{index + 1}</td>
                            <td>
                              <strong>
                                {student.name || "-"}
                              </strong>
                            </td>
                            <td>
                              {getMarks(student).toFixed(2)}
                            </td>
                            <td>
                              <span
                                className={`badge ${getRiskBadge(
                                  student
                                )}`}
                              >
                                {student.risk || "Low Risk"}
                              </span>
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          RECOMMENDATION
      ================================================== */}

      <div className="card shadow-sm border-0 mt-4">
        <div className="card-header bg-dark text-white">
          <h5 className="mb-0">
            💡 Dashboard Recommendation
          </h5>
        </div>

        <div className="card-body">
          {highRisk > 0 ? (
            <div className="alert alert-danger mb-0">
              <strong>Immediate Attention:</strong>{" "}
              {highRisk} student
              {highRisk !== 1 ? "s" : ""} classified as
              high risk. Academic mentoring and progress
              monitoring should be prioritized.
            </div>
          ) : mediumRisk > 0 ? (
            <div className="alert alert-warning mb-0">
              <strong>Improvement Recommended:</strong>{" "}
              {mediumRisk} student
              {mediumRisk !== 1 ? "s" : ""} classified as
              medium risk. Focus on attendance, assignments,
              and regular study practice.
            </div>
          ) : (
            <div className="alert alert-success mb-0">
              <strong>Good Overall Performance:</strong>{" "}
              Current student records show no high or medium
              risk students. Continue regular academic
              monitoring.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
