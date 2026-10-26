import Course from "../models/course.model.js";

function safeServiceError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

function serializeCourse(course) {
  return {
    id: course._id.toString(),
    title: course.title,
    provider: course.provider,
    profession: course.profession,
    credits: course.credits,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

export async function listCourses(request, response, next) {
  try {
    const courses = await Course.find({ owner: request.authUser.id }).sort({ createdAt: -1, _id: -1 }).lean();
    return response.status(200).json({
      status: "ok",
      data: courses.map(serializeCourse),
    });
  } catch {
    return next(safeServiceError("Courses could not be loaded. Please try again."));
  }
}

export async function createCourse(request, response, next) {
  try {
    const course = await Course.create({ ...request.validatedCourse, owner: request.authUser.id });
    return response.status(201).json({
      status: "ok",
      data: serializeCourse(course),
      message: "Course added successfully.",
    });
  } catch {
    return next(safeServiceError("Course could not be saved. Please try again."));
  }
}
