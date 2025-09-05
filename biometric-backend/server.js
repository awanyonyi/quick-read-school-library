// server.js
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // use service key on backend
);

const app = express();
app.use(express.json());
app.use(cors());

// Store fingerprint templates (from enrollment)
app.post("/api/biometric/enroll", async (req, res) => {
  const { studentId, template } = req.body;
  if (!studentId || !template) {
    return res.status(400).json({ error: "Missing studentId or template" });
  }

  try {
    const { error } = await supabase
      .from("students")
      .update({
        biometric_enrolled: true,
        biometric_template: template, // encrypted or hashed in production
      })
      .eq("id", studentId);

    if (error) throw error;

    res.json({ success: true, message: "Enrollment successful" });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to enroll biometric" });
  }
});

// Verification request: client sends scanned template
app.post("/api/biometric/verify", async (req, res) => {
  const { template } = req.body;
  if (!template) return res.status(400).json({ error: "Missing template" });

  try {
    // Fetch all enrolled students
    const { data: students, error } = await supabase
      .from("students")
      .select("id, name, admission_number, class, biometric_template")
      .eq("biometric_enrolled", true);

    if (error) throw error;

    // ⚠️ Placeholder match: in production, use DigitalPersona matcher SDK
    // Here we simulate match by comparing base64 strings
    const matchedStudent = students.find(
      (s) => s.biometric_template === template
    );

    if (matchedStudent) {
      return res.json({
        success: true,
        student: matchedStudent,
        message: "Verification successful",
      });
    } else {
      return res.status(401).json({ success: false, message: "No match found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "Verification failed" });
  }
});

app.listen(4000, () => {
  console.log("Biometric backend API running on port 4000");
});
