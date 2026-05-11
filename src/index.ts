import expresss from "express";
import User from "./models/userModel.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
const app = expresss();
app.use(expresss.json());

dotenv.config();

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

app.post("/api/v2/user/signin", async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);

  try {
    const user = await User.findOne(email);
    if (!user) {
      return { message: "user is not found" };
    }
    const validPass = await bcrypt.compare(password, (user as any).password);
    if (!validPass) return res.status(400).send("Invalid password");
    const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET!, {
      expiresIn: "1h",
    });
    res.header("auth-token", token).send({ token: token });
    res.status(200).json({ message: "user login successfully", token });
  } catch (error) {
    res.status(200).json({ message: "internal server error in user login" });
  }
});

const uri = "mongodb://127.0.0.1:27017/myDatabase";

try {
  mongoose.connect(uri);
  console.log("Connected to MongoDB successfully!");
  app.listen(3000);
} catch (error) {
  console.error("Connection error:", error);
}
