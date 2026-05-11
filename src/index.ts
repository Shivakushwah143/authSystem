import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import User from "./models/userModel.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.DB_URL || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/authentication";
const JWT_SECRET = process.env.TOKEN_SECRET?.trim().replace(/^['"]|['"]$/g, "");

if (!JWT_SECRET) {
  throw new Error("TOKEN_SECRET is required in .env");
}

app.use(express.json());

type AuthTokenPayload = JwtPayload & {
  userId: string;
};

const createAccessToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1m" });
};

const createRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

const createTokenPair = (userId: string) => ({
  accessToken: createAccessToken(userId),
  refreshToken: createRefreshToken(userId),
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const tokens = createTokenPair(user._id.toString());
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/auth/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    let decoded: AuthTokenPayload;

    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET) as AuthTokenPayload;
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    if (!decoded.userId) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken,
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokens = createTokenPair(user._id.toString());
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully!");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Connection error:", error);
    process.exit(1);
  });
