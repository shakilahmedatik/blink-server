const imgbbUploader = require('imgbb-uploader')
import { nanoid } from 'nanoid'
import slugify from 'slugify'
import Course from '../models/course'

// Upload Course Image
export const uploadImage = async (req, res) => {
  // console.log(req.body);
  try {
    const { image } = req.body
    if (!image) return res.status(400).send('No image')

    // Upload image in imgbb
    const options = {
      apiKey: process.env.IMGBB_API_KEY,
      base64string: image,
      name: nanoid(5),
    }
    imgbbUploader(options)
      .then(response => {
        console.log({
          display_url: response.display_url,
          delete_url: response.delete_url,
        })
        res.json({
          display_url: response.display_url,
          delete_url: response.delete_url,
        })
      })
      .catch(error => console.error(error))
  } catch (err) {
    console.log(err)
  }
}

// Create Course
export const create = async (req, res) => {
  console.log('Course Data----->', req.body)
  // return;
  try {
    const alreadyExist = await Course.findOne({
      slug: slugify(req.body.name.toLowerCase()),
    })
    if (alreadyExist)
      return res.status(400).send('Title is taken, use another title.')

    const course = await new Course({
      slug: slugify(req.body.name),
      instructor: req.user._id,
      ...req.body,
    }).save()

    res.json(course)
  } catch (err) {
    console.log(err)
    return res.status(400).send('Course create failed. Try again.')
  }
}
