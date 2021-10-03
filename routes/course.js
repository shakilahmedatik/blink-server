import express from 'express'
const router = express.Router()

// middleware
import { requireSignin, isInstructor } from '../middlewares'

// controllers
import { uploadImage, create } from '../controllers/course'

// image
router.post('/course/upload-image', uploadImage)
// course
router.post('/course', requireSignin, isInstructor, create)

module.exports = router
