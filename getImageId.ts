import * as sha1 from 'sha1'
import * as parse from 'url-parse'

const getUrlFileExtension = (url: string): string => {
  const lastPathSegment = parse(url).pathname.split('/.').pop()
  const ext = lastPathSegment.split('.').pop()
  return (ext === lastPathSegment)
    ? null
    : ext
}

const getImageId = (imageUrl: string): string => {
  const ext = getUrlFileExtension(imageUrl)
  return ext
    ? `${sha1(imageUrl)}.${ext}`
    : sha1(imageUrl)
}

export default getImageId
