import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda'
import request from 'request'
import * as AWS from 'aws-sdk'
import * as sharp from 'sharp'
import { encode } from 'node-base64-image'
import * as fileType from 'file-type'
import * as R from 'ramda'
import uploadImageToS3 from '../uploadImageToS3'
import getImageId from '../getImageId'

const s3 = new AWS.S3()
const originalImageBucket = process.env.ORIGINAL_IMAGE_BUCKET
const resizedImageBucket = process.env.RESIZED_IMAGE_BUCKET

const getResizedImageUrl = (imageId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    s3.getObject({Bucket: resizedImageBucket, Key: imageId}, (err, data) => {
      if (err && err.code === 'NoSuchKey') {
        return resolve(null)
      }
      if (err) {
        return reject(err)
      }
      resolve('http:/fake.png')
    })
  })
}

const resizeImage = (
  imageId: string,
  width: number,
  height: number): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    s3.getObject({Bucket: originalImageBucket, Key: imageId}, (err, data) => {
      if (err && err.code === 'NoSuchKey') {
        return reject(new Error('There is no such original image stored'))
      }
      if (err) {
        return reject(err)
      }
      sharp(data.Body as any)
        .resize(width, height)
        .toBuffer()
        .then(resolve)
    }))

const getResized: Handler = async (event: APIGatewayEvent, context: Context, cb: Callback) => {
  const requestBody = JSON.parse(event.body)
  const remoteImageUrl = event.queryStringParameters['image_url']
  const width = parseInt(event.queryStringParameters['width'])
  const height = parseInt(event.queryStringParameters['height'])

  if (!remoteImageUrl) {
    context.fail(new Error('image_url is required in the body'))
    return
  }
  console.log('yoo')
  try {
    const imageId = getImageId(remoteImageUrl)
    let resizedImageUrl = await getResizedImageUrl(imageId)
    if (resizedImageUrl === null) {
      const resizedImage = await resizeImage(imageId, width, height)
      resizedImageUrl = await uploadImageToS3(resizedImage, imageId, resizedImageBucket)
    }
    cb(
      null,
      {
        statusCode: 200,
        body: JSON.stringify({image: resizedImageUrl})
      }
    )
  } catch (e) {
    console.log('e: ', e)
    context.fail(e)
  }
}

export default getResized
