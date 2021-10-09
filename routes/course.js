import express from 'express'
import formidable from 'express-formidable'

const router = express.Router()

// middleware
import { requireSignin, isInstructor } from '../middlewares'

// controllers
import {
  uploadImage,
  create,
  read,
  uploadVideo,
  removeVideo,
  addLesson,
  update,
  removeLesson,
  updateLesson,
  publishCourse,
  unpublishCourse,
  courses,
} from '../controllers/course'

router.get('/courses', courses)

// image
router.post('/course/upload-image', uploadImage)
// course
router.post('/course', requireSignin, isInstructor, create)
router.put('/course/:slug', requireSignin, update)
router.get('/course/:slug', read)
// Video
router.post(
  '/course/video-upload/:instructorId',
  requireSignin,
  formidable(),
  uploadVideo
)
router.post('/course/remove-video/:courseId', requireSignin, removeVideo)
// publish or unpublish course
router.put('/course/publish/:courseId', requireSignin, publishCourse)
router.put('/course/unpublish/:courseId', requireSignin, unpublishCourse)
// Lesson
router.post('/course/lesson/:slug/:instructorId', requireSignin, addLesson)
router.put('/course/lesson/:slug/:instructorId', requireSignin, updateLesson)
router.put('/course/:slug/:lessonId', requireSignin, removeLesson)

module.exports = router
