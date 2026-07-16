const prisma = require('../prisma');

/**
 * Course CRUD Controller.
 */
exports.getCourses = async (req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      where: { userId: req.user.id }
    });
    res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { name } = req.body;
    
    // Check if unique constraint would be violated manually or let Prisma throw
    const course = await prisma.course.create({
      data: {
        userId: req.user.id,
        name
      }
    });
    
    res.status(201).json(course);
  } catch (error) {
    // Handle uniqueness constraint P2002
    if (error.code === 'P2002') {
      return res.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: 'A course with this name already exists'
      });
    }
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const course = await prisma.course.update({
      where: { id, userId: req.user.id },
      data: { name }
    });
    
    res.status(200).json(course);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Course not found or unauthorized'
      });
    }
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.course.delete({
      where: { id, userId: req.user.id }
    });
    
    res.status(204).end();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Course not found or unauthorized'
      });
    }
    next(error);
  }
};
