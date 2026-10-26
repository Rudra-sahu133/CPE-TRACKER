import mongoose from "mongoose";

export const PROFESSIONAL_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

const professionalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    immutable: true,
  },
  profession: {
    type: String,
    required: true,
    enum: ["CPA", "Attorney"],
  },
  state: {
    type: String,
    required: true,
    enum: PROFESSIONAL_STATES,
  },
  licenseExpiry: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

professionalSchema.index({ owner: 1, email: 1 }, { unique: true, name: "owner_1_email_1" });
professionalSchema.index({ owner: 1, createdAt: -1, _id: -1 }, { name: "owner_1_createdAt_-1__id_-1" });

const Professional = mongoose.models.Professional
  || mongoose.model("Professional", professionalSchema);

export default Professional;
