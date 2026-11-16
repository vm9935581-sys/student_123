
import { useCallback, useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { jsPDF } from "jspdf";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Dashboard from "./dashboard";
import Login from "./login";

const API_URL = "http://127.0.0.1:5000";

const EMPTY_FORM = {
  name: "",
  rollNumber: "",
  email: "",
  phone: "",
  age: "",
  department: "",
  semester: "",
  attendance: "",
  previousMarks: "",
  assignmentMarks: "",
  internalMarks: "",
  studyHours: "",
  completedAssignments: "",
  previousFailures: "",
};

const DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Electrical",
  "Information Science",
  "Mechanical",
  "Civil",
];

const readField = (student, camel, snake = camel) =>
  student?.[camel] ?? student?.[snake] ?? "";

const getMarks = (student) =>
  Number(readField(student, "predictedMarks", "predicted_marks") || 0);

function normalizeStudent(student) {
  return {
    ...student,
    id: student.id,
    name: student.name ?? "",
    rollNumber: readField(student, "rollNumber", "roll_number"),
    email: student.email ?? "",
    phone: student.phone ?? "",
    age: student.age ?? "",
    department: student.department ?? "",
    semester: student.semester ?? "",
    attendance: Number(student.attendance || 0),
    previousMarks: Number(
      readField(student, "previousMarks", "previous_marks") || 0
    ),
    assignmentMarks: Number(
      readField(student, "assignmentMarks", "assignment_marks") || 0
    ),
    internalMarks: Number(
      readField(student, "internalMarks", "internal_marks") || 0
    ),
    studyHours: Number(
      readField(student, "studyHours", "study_hours") || 0
    ),
    completedAssignments: Number(
      readField(
        student,
        "completedAssignments",
        "completed_assignments"
      ) || 0
    ),
    previousFailures: Number(
      readField(student, "previousFailures", "previous_failures") || 0
    ),
    predictedMarks: getMarks(student),
    performance: student.performance ?? "",
    risk: student.risk ?? "",
    createdAt: readField(student, "createdAt", "created_at"),
  };
}

function getRecommendation(student) {
  const marks = getMarks(student);
  const attendance = Number(student.attendance || 0);
  const failures = Number(student.previousFailures || 0);
  const risk = String(student.risk || "").toLowerCase();

  if (risk.includes("high") || marks < 40 || failures >= 2) {
    return {
      title: "Immediate Academic Support",
      message:
        "Arrange additional mentoring, regular revision, extra practice, and frequent progress monitoring.",
      className: "alert-danger",
    };
  }

  if (
    risk.includes("medium") ||
    marks < 60 ||
    attendance < 75
  ) {
    return {
      title: "Improvement Recommended",
      message:
        "Improve attendance, complete assignments on time, and increase focused study and revision.",
      className: "alert-warning",
    };
  }

  return {
    title: "Continue Current Progress",
    message:
      "Maintain good attendance, continue regular study, and aim for further improvement.",
    className: "alert-success",
  };
}

const csvEscape = (value) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [comparisonIds, setComparisonIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  // Load saved student records from Flask/MySQL.
  const loadStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);

      const response = await fetch(`${API_URL}/students`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const data = await response.json();

      if (!response.ok || data.success === false || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data.students)
        ? data.students
        : Array.isArray(data.data)
        ? data.data
        : null;

      if (!records) {
        console.error("Unexpected Flask response:", data);
        throw new Error("The server did not return a student list.");
      }

      const normalized = records.map(normalizeStudent);
      setStudents(normalized);

      console.log(
        `Student records loaded: ${normalized.length}`,
        normalized
      );
    } catch (error) {
      console.error("Unable to load student records:", error);
      alert(
        `Unable to load student records.\n\n${error.message}\n\n` +
          "Check that MySQL and Flask are running."
      );
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadStudents();
    }
  }, [isLoggedIn, loadStudents]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setPage("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPage("dashboard");
    setSelectedStudent(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingStudent(null);
  };

  // Add a student and predict marks, or update an existing record.
  const handlePrediction = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter the student name.");
      return;
    }

    if (!formData.rollNumber.trim()) {
      alert("Please enter the roll number.");
      return;
    }

    if (!formData.department) {
      alert("Please select a department.");
      return;
    }

    if (!formData.semester) {
      alert("Please enter the semester.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      rollNumber: formData.rollNumber.trim(),
      email: formData.email,
      phone: formData.phone,
      age: formData.age === "" ? null : Number(formData.age),
      department: formData.department,
      semester: Number(formData.semester),
      attendance: Number(formData.attendance),
      previousMarks: Number(formData.previousMarks),
      assignmentMarks: Number(formData.assignmentMarks),
      internalMarks: Number(formData.internalMarks),
      studyHours: Number(formData.studyHours),
      completedAssignments: Number(formData.completedAssignments),
      previousFailures: Number(formData.previousFailures),
    };

    try {
      const editing = Boolean(editingStudent);
      const url = editing
        ? `${API_URL}/students/${editingStudent.id}`
        : `${API_URL}/predict`;

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false || result.error) {
        throw new Error(
          result.error ||
            result.message ||
            `Server error: ${response.status}`
        );
      }

      await loadStudents();
      resetForm();
      setPage("dashboard");

      alert(
        editing
          ? "Student record updated successfully."
          : "Prediction completed and student saved successfully."
      );
    } catch (error) {
      console.error("Save/prediction error:", error);
      alert(
        `Unable to save the student record.\n\n${error.message}\n\n` +
          "Check that Flask and MySQL are running."
      );
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);

    setFormData({
      name: student.name ?? "",
      rollNumber: student.rollNumber ?? "",
      email: student.email ?? "",
      phone: student.phone ?? "",
      age: student.age ?? "",
      department: student.department ?? "",
      semester: student.semester ?? "",
      attendance: student.attendance ?? "",
      previousMarks: student.previousMarks ?? "",
      assignmentMarks: student.assignmentMarks ?? "",
      internalMarks: student.internalMarks ?? "",
      studyHours: student.studyHours ?? "",
      completedAssignments: student.completedAssignments ?? "",
      previousFailures: student.previousFailures ?? "",
    });

    setPage("prediction");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student record?")) return;

    try {
      const response = await fetch(`${API_URL}/students/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      setSelectedStudent(null);
      setComparisonIds((ids) => ids.filter((item) => item !== id));
      await loadStudents();
      alert("Student record deleted successfully.");
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Unable to delete the student.\n\n${error.message}`);
    }
  };

  const handleClearAll = async () => {
    if (students.length === 0) {
      alert("No student records are available.");
      return;
    }

    if (
      !window.confirm(
        "Delete ALL student records? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/students`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      setComparisonIds([]);
      setSelectedStudent(null);
      await loadStudents();
      alert("All student records have been deleted.");
    } catch (error) {
      console.error("Clear records error:", error);
      alert(`Unable to clear records.\n\n${error.message}`);
    }
  };

  const filteredStudents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return students
      .filter((student) => {
        if (!search) return true;

        return (
          String(student.name).toLowerCase().includes(search) ||
          String(student.rollNumber).toLowerCase().includes(search) ||
          String(student.department).toLowerCase().includes(search)
        );
      })
      .filter(
        (student) =>
          !departmentFilter ||
          String(student.department).toLowerCase() ===
            departmentFilter.toLowerCase()
      )
      .filter(
        (student) =>
          !riskFilter ||
          String(student.risk).toLowerCase().includes(riskFilter)
      );
  }, [students, searchTerm, departmentFilter, riskFilter]);

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      if (sortOrder === "marksHigh") return getMarks(b) - getMarks(a);
      if (sortOrder === "marksLow") return getMarks(a) - getMarks(b);

      if (sortOrder === "name") {
        return String(a.name).localeCompare(String(b.name));
      }

      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [filteredStudents, sortOrder]);

  const comparisonStudents = useMemo(
    () =>
      comparisonIds
        .map((id) => students.find((student) => student.id === id))
        .filter(Boolean),
    [comparisonIds, students]
  );

  const toggleComparison = (student) => {
    setComparisonIds((current) => {
      if (current.includes(student.id)) {
        return current.filter((id) => id !== student.id);
      }

      if (current.length >= 3) {
        alert("You can compare a maximum of 3 students.");
        return current;
      }

      return [...current, student.id];
    });
  };

  const exportToCSV = () => {
    if (!students.length) {
      alert("No student records to export.");
      return;
    }

    const headers = [
      "Name",
      "Roll Number",
      "Email",
      "Phone",
      "Age",
      "Department",
      "Semester",
      "Attendance",
      "Previous Marks",
      "Assignment Marks",
      "Internal Marks",
      "Study Hours",
      "Completed Assignments",
      "Previous Failures",
      "Predicted Marks",
      "Performance",
      "Risk",
      "Created At",
    ];

    const keys = [
      "name",
      "rollNumber",
      "email",
      "phone",
      "age",
      "department",
      "semester",
      "attendance",
      "previousMarks",
      "assignmentMarks",
      "internalMarks",
      "studyHours",
      "completedAssignments",
      "previousFailures",
      "predictedMarks",
      "performance",
      "risk",
      "createdAt",
    ];

    const csv = [
      headers,
      ...students.map((student) => keys.map((key) => student[key])),
    ]
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_performance_records.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (!students.length) {
      alert("No student records to export.");
      return;
    }

    const headers = [
      "Name",
      "Roll Number",
      "Department",
      "Semester",
      "Attendance",
      "Previous Marks",
      "Assignment Marks",
      "Internal Marks",
      "Study Hours",
      "Completed Assignments",
      "Previous Failures",
      "Predicted Marks",
      "Performance",
      "Risk",
    ];

    const keys = [
      "name",
      "rollNumber",
      "department",
      "semester",
      "attendance",
      "previousMarks",
      "assignmentMarks",
      "internalMarks",
      "studyHours",
      "completedAssignments",
      "previousFailures",
      "predictedMarks",
      "performance",
      "risk",
    ];

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const rows = students
      .map(
        (student) =>
          `<tr>${keys
            .map((key) => `<td>${escapeHtml(student[key])}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const html = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead>
              <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_performance_records.xls";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!students.length) {
      alert("No student records to export.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Student Performance Prediction Report", 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

    let y = 35;

    students.forEach((student, index) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.text(`${index + 1}. ${student.name || "Student"}`, 14, y);
      doc.setFontSize(9);
      doc.text(`Roll Number: ${student.rollNumber || "-"}`, 20, y + 6);
      doc.text(`Department: ${student.department || "-"}`, 20, y + 12);
      doc.text(`Predicted Marks: ${getMarks(student).toFixed(2)}`, 20, y + 18);
      doc.text(`Performance: ${student.performance || "-"}`, 20, y + 24);
      doc.text(`Risk: ${student.risk || "-"}`, 20, y + 30);
      y += 38;
    });

    doc.save("student_performance_report.pdf");
  };

  const exportStudentPDF = (student) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Individual Student Performance Report", 14, 18);
    doc.setFontSize(10);
    doc.text("Student Performance Prediction System", 14, 25);
    doc.line(14, 29, 196, 29);

    const details = [
      ["Name", student.name],
      ["Roll Number", student.rollNumber],
      ["Email", student.email],
      ["Phone", student.phone],
      ["Age", student.age],
      ["Department", student.department],
      ["Semester", student.semester],
      ["Attendance", `${student.attendance}%`],
      ["Previous Marks", student.previousMarks],
      ["Assignment Marks", student.assignmentMarks],
      ["Internal Marks", student.internalMarks],
      ["Study Hours / Day", student.studyHours],
      ["Completed Assignments", student.completedAssignments],
      ["Previous Failures", student.previousFailures],
      ["Predicted Marks", getMarks(student).toFixed(2)],
      ["Performance", student.performance],
      ["Risk", student.risk],
    ];

    let y = 39;

    details.forEach(([label, value]) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 16, y);
      doc.setFont("helvetica", "normal");

      const lines = doc.splitTextToSize(String(value ?? "-"), 115);
      doc.text(lines, 70, y);
      y += Math.max(7, lines.length * 5);
    });

    const recommendation = getRecommendation(student);

    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.text(recommendation.title, 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      doc.splitTextToSize(recommendation.message, 175),
      16,
      y + 7
    );

    const safeName = String(student.name || "student").replace(
      /[^a-z0-9]+/gi,
      "_"
    );

    doc.save(`student_performance_${safeName}.pdf`);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const departmentData = Object.values(
    students.reduce((groups, student) => {
      const department = student.department || "Unknown";

      if (!groups[department]) {
        groups[department] = {
          department,
          count: 0,
          totalMarks: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
        };
      }

      const item = groups[department];
      item.count += 1;
      item.totalMarks += getMarks(student);

      const risk = String(student.risk || "").toLowerCase();

      if (risk.includes("high")) item.highRisk += 1;
      else if (risk.includes("medium")) item.mediumRisk += 1;
      else item.lowRisk += 1;

      return groups;
    }, {})
  )
    .map((item) => ({
      ...item,
      averageMarks: item.count ? item.totalMarks / item.count : 0,
    }))
    .sort((a, b) => b.averageMarks - a.averageMarks);

  const comparisonChartData = comparisonStudents.map((student) => ({
    name: student.name || "Student",
    predictedMarks: getMarks(student),
    attendance: Number(student.attendance || 0),
    studyHours: Number(student.studyHours || 0),
  }));

  return (
    <div className="bg-light min-vh-100">
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container-fluid px-3 py-2">
          <span className="navbar-brand fw-bold">
            🎓 Student Performance Prediction System
          </span>

          <div className="d-flex flex-wrap gap-2">
            {[
              ["dashboard", "📊 Dashboard"],
              ["prediction", "📝 Prediction"],
              ["records", "📋 Student Records"],
              ["department", "🏢 Departments"],
              ["ranking", "🏆 Rankings"],
              ["comparison", "👥 Compare"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`btn btn-sm ${
                  page === value ? "btn-primary" : "btn-outline-light"
                }`}
                onClick={() => setPage(value)}
              >
                {label}
              </button>
            ))}

            <button className="btn btn-sm btn-danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {loadingStudents && (
        <div className="alert alert-info rounded-0 mb-0 text-center">
          Loading student records from MySQL...
        </div>
      )}

      {page === "dashboard" && <Dashboard students={students} />}

      {page === "prediction" && (
        <main className="container-fluid px-3 px-md-4 py-4">
          <h2 className="fw-bold mb-1">📝 Student Performance Prediction</h2>
          <p className="text-muted mb-4">
            Enter the student's information and academic details.
          </p>

          <form
            onSubmit={handlePrediction}
            className="card shadow-sm border-0"
          >
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                {editingStudent ? "✏️ Edit Student" : "👤 Student Information"}
              </h5>
            </div>

            <div className="card-body">
              <div className="row g-3">
                {[
                  ["name", "Student Name", "text", true],
                  ["rollNumber", "Roll Number", "text", true],
                  ["email", "Email", "email", false],
                  ["phone", "Phone", "tel", false],
                  ["age", "Age", "number", false],
                  ["semester", "Semester", "number", true],
                ].map(([name, label, type, required]) => (
                  <div className="col-md-4" key={name}>
                    <label className="form-label fw-semibold">{label}</label>
                    <input
                      className="form-control"
                      type={type}
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      required={required}
                      min={
                        type === "number"
                          ? name === "age"
                            ? 15
                            : 1
                          : undefined
                      }
                      max={
                        type === "number"
                          ? name === "age"
                            ? 100
                            : name === "semester"
                            ? 12
                            : undefined
                          : undefined
                      }
                    />
                  </div>
                ))}

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Department</label>
                  <select
                    className="form-select"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                {[
                  ["attendance", "Attendance (%)", 0, 100, "0.1"],
                  ["previousMarks", "Previous Marks", 0, 100, "0.1"],
                  ["assignmentMarks", "Assignment Marks", 0, 100, "0.1"],
                  ["internalMarks", "Internal Marks", 0, 100, "0.1"],
                  ["studyHours", "Study Hours / Day", 0, 24, "0.1"],
                  ["completedAssignments", "Completed Assignments", 0, undefined, "1"],
                  ["previousFailures", "Previous Failures", 0, undefined, "1"],
                ].map(([name, label, min, max, step]) => (
                  <div className="col-md-4" key={name}>
                    <label className="form-label fw-semibold">{label}</label>
                    <input
                      className="form-control"
                      type="number"
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      min={min}
                      max={max}
                      step={step}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="d-flex flex-wrap gap-2 mt-4">
                <button type="submit" className="btn btn-primary btn-lg">
                  🤖 {editingStudent ? "Update Student" : "Predict & Save"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={resetForm}
                >
                  Clear Form
                </button>
              </div>
            </div>
          </form>
        </main>
      )}

      {page === "records" && (
        <main className="container-fluid px-3 px-md-4 py-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h2 className="fw-bold mb-1">📋 Student Records</h2>
              <p className="text-muted mb-0">
                Total saved records: {students.length}
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-outline-primary" onClick={loadStudents}>
                Refresh
              </button>
              <button className="btn btn-success" onClick={exportToCSV}>
                Export CSV
              </button>
              <button className="btn btn-primary" onClick={exportToExcel}>
                Export Excel
              </button>
              <button className="btn btn-warning" onClick={exportToPDF}>
                Export PDF
              </button>
              <button
                className="btn btn-outline-dark"
                onClick={() => window.print()}
              >
                Print
              </button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Search students</label>
                  <input
                    className="form-control"
                    placeholder="Search name, roll number, department"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={departmentFilter}
                    onChange={(event) => setDepartmentFilter(event.target.value)}
                  >
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2">
                  <label className="form-label">Risk</label>
                  <select
                    className="form-select"
                    value={riskFilter}
                    onChange={(event) => setRiskFilter(event.target.value)}
                  >
                    <option value="">All Risks</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label">Sort by</label>
                  <select
                    className="form-select"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="marksHigh">Highest Marks</option>
                    <option value="marksLow">Lowest Marks</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </div>
              </div>

              {sortedStudents.length === 0 ? (
                <div className="alert alert-info text-center">
                  <h5>
                    {students.length
                      ? "No Matching Student Records"
                      : "No Student Records Available"}
                  </h5>
                  <p>
                    {students.length
                      ? "Try changing the search or filters."
                      : "Click Refresh. If the list stays empty, check the Flask terminal and MySQL connection."}
                  </p>
                  <button className="btn btn-primary" onClick={loadStudents}>
                    Refresh Records
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Roll Number</th>
                        <th>Department</th>
                        <th>Attendance</th>
                        <th>Predicted Marks</th>
                        <th>Performance</th>
                        <th>Risk</th>
                        <th>Compare</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedStudents.map((student, index) => (
                        <tr key={student.id ?? `${student.rollNumber}-${index}`}>
                          <td>{index + 1}</td>
                          <td className="fw-semibold">{student.name}</td>
                          <td>{student.rollNumber || "-"}</td>
                          <td>{student.department || "-"}</td>
                          <td>{student.attendance}%</td>
                          <td>
                            <span
                              className={`badge ${
                                getMarks(student) >= 80
                                  ? "bg-success"
                                  : getMarks(student) >= 40
                                  ? "bg-warning text-dark"
                                  : "bg-danger"
                              }`}
                            >
                              {getMarks(student).toFixed(2)}
                            </span>
                          </td>
                          <td>{student.performance || "-"}</td>
                          <td>
                            <span
                              className={`badge ${
                                String(student.risk).toLowerCase().includes("high")
                                  ? "bg-danger"
                                  : String(student.risk).toLowerCase().includes("medium")
                                  ? "bg-warning text-dark"
                                  : "bg-success"
                              }`}
                            >
                              {student.risk || "-"}
                            </span>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              aria-label={`Compare ${student.name}`}
                              checked={comparisonIds.includes(student.id)}
                              onChange={() => toggleComparison(student)}
                            />
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              <button
                                className="btn btn-info btn-sm"
                                onClick={() => setSelectedStudent(student)}
                              >
                                View
                              </button>
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => handleEdit(student)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(student.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {page === "department" && (
        <main className="container-fluid px-3 px-md-4 py-4">
          <h2 className="fw-bold">🏢 Department Performance Analysis</h2>
          <p className="text-muted">
            Compare average predicted marks and risk across departments.
          </p>

          {!departmentData.length ? (
            <div className="alert alert-info">
              No student records available for department analysis.
            </div>
          ) : (
            <>
              <div className="alert alert-success">
                🏆 Top Performing Department:{" "}
                <strong>{departmentData[0].department}</strong> — average marks{" "}
                {departmentData[0].averageMarks.toFixed(2)}.
              </div>

              <section className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <h5 className="text-center">Average Predicted Marks</h5>
                  <div style={{ width: "100%", height: 350 }}>
                    <ResponsiveContainer>
                      <BarChart data={departmentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="averageMarks"
                          name="Average Marks"
                          fill="#0d6efd"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <div className="table-responsive card border-0 shadow-sm">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Rank</th>
                      <th>Department</th>
                      <th>Students</th>
                      <th>Average Marks</th>
                      <th>Low Risk</th>
                      <th>Medium Risk</th>
                      <th>High Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentData.map((item, index) => (
                      <tr key={item.department}>
                        <td>{index + 1}</td>
                        <td>{item.department}</td>
                        <td>{item.count}</td>
                        <td>{item.averageMarks.toFixed(2)}</td>
                        <td>{item.lowRisk}</td>
                        <td>{item.mediumRisk}</td>
                        <td>{item.highRisk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      )}

      {page === "ranking" && (
        <main className="container-fluid px-3 px-md-4 py-4">
          <h2 className="fw-bold">🏆 Student Ranking</h2>
          <p className="text-muted">
            Students ranked from highest to lowest predicted marks.
          </p>

          {!students.length ? (
            <div className="alert alert-info">No student records available.</div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Roll Number</th>
                      <th>Department</th>
                      <th>Predicted Marks</th>
                      <th>Performance</th>
                      <th>Risk</th>
                      <th>Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...students]
                      .sort((a, b) => getMarks(b) - getMarks(a))
                      .map((student, index) => (
                        <tr key={student.id ?? index}>
                          <td>
                            {index === 0
                              ? "🥇 1"
                              : index === 1
                              ? "🥈 2"
                              : index === 2
                              ? "🥉 3"
                              : index + 1}
                          </td>
                          <td>{student.name}</td>
                          <td>{student.rollNumber}</td>
                          <td>{student.department}</td>
                          <td>{getMarks(student).toFixed(2)}</td>
                          <td>{student.performance || "-"}</td>
                          <td>{student.risk || "-"}</td>
                          <td>
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => exportStudentPDF(student)}
                            >
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      )}

      {page === "comparison" && (
        <main className="container-fluid px-3 px-md-4 py-4">
          <h2 className="fw-bold">👥 Compare Students</h2>
          <p className="text-muted">
            Select up to three students from Student Records to compare them.
          </p>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <p>
                Selected: <strong>{comparisonStudents.length} / 3</strong>
              </p>
              {comparisonStudents.length === 0 ? (
                <div className="alert alert-info mb-0">
                  No students selected. Open Student Records and select the
                  Compare checkbox beside each student.
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {comparisonStudents.map((student) => (
                    <button
                      key={student.id}
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => toggleComparison(student)}
                    >
                      Remove {student.name} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {comparisonStudents.length > 0 && (
            <>
              <section className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="text-center">Predicted Marks Comparison</h5>
                  <div style={{ width: "100%", height: 350 }}>
                    <ResponsiveContainer>
                      <BarChart data={comparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="predictedMarks"
                          name="Predicted Marks"
                          fill="#0d6efd"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="text-center">Academic Details Comparison</h5>
                  <div style={{ width: "100%", height: 350 }}>
                    <ResponsiveContainer>
                      <LineChart data={comparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="attendance"
                          name="Attendance (%)"
                          stroke="#198754"
                        />
                        <Line
                          type="monotone"
                          dataKey="studyHours"
                          name="Study Hours"
                          stroke="#dc3545"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <div className="table-responsive card border-0 shadow-sm">
                <table className="table table-bordered align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Details</th>
                      {comparisonStudents.map((student) => (
                        <th key={student.id}>{student.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Roll Number", "rollNumber"],
                      ["Department", "department"],
                      ["Semester", "semester"],
                      ["Attendance (%)", "attendance"],
                      ["Previous Marks", "previousMarks"],
                      ["Assignment Marks", "assignmentMarks"],
                      ["Internal Marks", "internalMarks"],
                      ["Study Hours", "studyHours"],
                      ["Predicted Marks", "predictedMarks"],
                      ["Performance", "performance"],
                      ["Risk", "risk"],
                    ].map(([label, key]) => (
                      <tr key={key}>
                        <th>{label}</th>
                        {comparisonStudents.map((student) => (
                          <td key={student.id}>
                            {key === "predictedMarks"
                              ? getMarks(student).toFixed(2)
                              : student[key] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      )}

      {selectedStudent && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedStudent(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  Student Details — {selectedStudent.name}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setSelectedStudent(null)}
                />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  {[
                    ["Name", selectedStudent.name],
                    ["Roll Number", selectedStudent.rollNumber],
                    ["Email", selectedStudent.email],
                    ["Phone", selectedStudent.phone],
                    ["Age", selectedStudent.age],
                    ["Department", selectedStudent.department],
                    ["Semester", selectedStudent.semester],
                    ["Attendance", `${selectedStudent.attendance}%`],
                    ["Previous Marks", selectedStudent.previousMarks],
                    ["Assignment Marks", selectedStudent.assignmentMarks],
                    ["Internal Marks", selectedStudent.internalMarks],
                    ["Study Hours", selectedStudent.studyHours],
                    ["Completed Assignments", selectedStudent.completedAssignments],
                    ["Previous Failures", selectedStudent.previousFailures],
                    ["Predicted Marks", getMarks(selectedStudent).toFixed(2)],
                    ["Performance", selectedStudent.performance],
                    ["Risk", selectedStudent.risk],
                    ["Created At", selectedStudent.createdAt],
                  ].map(([label, value]) => (
                    <div className="col-md-6" key={label}>
                      <div className="border rounded p-3 h-100">
                        <small className="text-muted d-block">{label}</small>
                        <strong>{value || "-"}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <section className="card border-0 bg-light mt-4">
                  <div className="card-body">
                    <h5>📈 Marks Overview</h5>
                    <div style={{ width: "100%", height: 280 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={[
                            {
                              category: "Previous",
                              marks: selectedStudent.previousMarks,
                            },
                            {
                              category: "Assignment",
                              marks: selectedStudent.assignmentMarks,
                            },
                            {
                              category: "Internal",
                              marks: selectedStudent.internalMarks,
                            },
                            {
                              category: "Predicted",
                              marks: getMarks(selectedStudent),
                            },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="marks" name="Marks" fill="#0d6efd" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>

                <div
                  className={`alert ${getRecommendation(selectedStudent).className} mt-3 mb-0`}
                >
                  <strong>{getRecommendation(selectedStudent).title}</strong>
                  <p className="mb-0 mt-2">
                    {getRecommendation(selectedStudent).message}
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => exportStudentPDF(selectedStudent)}
                >
                  Download Student PDF
                </button>
                <button
                  className="btn btn-warning"
                  onClick={() => {
                    const student = selectedStudent;
                    setSelectedStudent(null);
                    handleEdit(student);
                  }}
                >
                  Edit Student
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedStudent(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-muted py-4">
        Student Performance Prediction System · Flask + MySQL
      </footer>
    </div>
  );
}

export default App;
