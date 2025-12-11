/**
 * 下载Blob对象为文件
 * @param blob 要下载的Blob对象
 * @param filename 下载的文件名
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

