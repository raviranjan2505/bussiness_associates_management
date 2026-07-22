import React, { useRef, useState } from "react"
import { FaCamera } from "react-icons/fa"
import { MdDelete } from "react-icons/md"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB — profile photos should stay small

const ProfilePhotoSelector = ({ image, setImage }) => {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState("")

  const handleImageChange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG and PNG images are allowed.")
      setImage(null)
      setPreviewUrl(null)
      event.target.value = ""
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image is too large. Maximum allowed size is 5MB.")
      setImage(null)
      setPreviewUrl(null)
      event.target.value = ""
      return
    }

    setError("")
    setImage(file)
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
  }

  const handleRemoveImage = () => {
    setImage(null)
    setPreviewUrl(null)
    setError("")
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-3">
        <div
          className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition-all"
          onClick={() => inputRef.current.click()}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <FaCamera className="text-3xl text-gray-400" />
          )}
        </div>

        {previewUrl && (
          <button
            type="button"
            className="absolute -bottom-2 -right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
            onClick={handleRemoveImage}
          >
            <MdDelete className="text-sm" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 text-center mb-2 max-w-[200px]">{error}</p>
      )}
      {!error && (
        <p className="text-[11px] text-gray-400 text-center mb-2">JPG or PNG, up to 5MB</p>
      )}

      <input
        type="file"
        ref={inputRef}
        onChange={handleImageChange}
        accept="image/png, image/jpeg"
        className="hidden"
      />
    </div>
  )
}

export default ProfilePhotoSelector
