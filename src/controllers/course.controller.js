/**
 * Course CRUD Controller stub.
 */
exports.getCourses = async (req, res, next) => {
  try {
    res.status(200).json([
      { id: '11111111-1111-1111-1111-111111111111', userId: req.user.id, name: 'Web Programming' },
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', userId: req.user.id, name: 'Databases' }
    ]);
  } catch (error) {
    next(error);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { name } = req.body;
    res.status(201).json({
      id: '11111111-1111-1111-1111-111111111111',
      userId: req.user.id,
      name
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    res.status(200).json({
      id,
      userId: req.user.id,
      name
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
