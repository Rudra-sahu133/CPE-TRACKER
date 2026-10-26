import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 180,
  },
  provider: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 120,
  },
  profession: {
    type: String,
    required: true,
    enum: ["CPA", "Attorney", "Both"],
  },
  credits: {
    type: Number,
    required: true,
    min: 0.01,
    max: 200,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    immutable: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

courseSchema.index({ owner: 1, createdAt: -1, _id: -1 }, { name: "owner_1_createdAt_-1__id_-1" });

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

export default Course;
