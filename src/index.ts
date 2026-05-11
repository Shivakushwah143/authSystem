import expresss from "express";
import User from "./models/userModel.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
const app = expresss();

app.post("/api/v2/user/signup", async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);

  try {
    const user = await User.create({
      email: email,
      password: await bcrypt.hash(password, 8),
    });
    res.status(201).json({ message: "user register successfully ", user });
  } catch (error) {
    res.status(500).json({ message: "internal server error" });
  }
});

app.post("/api/v2/user/signin", async (req, res) => {});

const uri = "mongodb://127.0.0.1:27017/myDatabase";

try {
  mongoose.connect(uri);
  console.log("Connected to MongoDB successfully!");
  app.listen(3000);
} catch (error) {
  console.error("Connection error:", error);
}
