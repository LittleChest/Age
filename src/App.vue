<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6">
            <v-card class="pa-6" elevation="6">
              <v-card-title class="justify-center">年龄识别</v-card-title>
              <v-card-text>
                <div class="flex justify-center text-center">
                  <video ref="video" autoplay playsinline muted width="320" height="240" class="rounded-lg bg-black"
                    v-show="cameraActive && !photoData"></video>

                  <img v-if="photoData" :src="photoData" alt="预览" width="320" height="240"
                    class="rounded-lg object-cover" />
                </div>

                <div v-if="errorMsg" class="text-red-600 text-center mt-2">
                  {{ errorMsg }}
                </div>

                <div class="mt-4 flex gap-3 justify-center items-center">
                  <v-btn color="primary" @click="takePhoto" :disabled="!cameraActive" v-if="!photoData">拍照</v-btn>
                  <v-btn color="secondary" @click="retake" v-if="photoData">重拍</v-btn>
                  <v-btn color="success" @click="uploadPhoto" :disabled="!photoBlob">上传</v-btn>
                  <label>
                    <input type="file" accept="image/*" @change="onFileChange" class="hidden" ref="fileInput" />
                    <v-btn color="info" @click="$refs.fileInput.click()">从相册选择</v-btn>
                  </label>
                </div>

                <v-progress-linear :indeterminate="true" color="primary" v-if="loading"
                  class="mt-4"></v-progress-linear>

                <div v-if="Array.isArray(debug) && debug.length" class="mt-4">
                  <div v-for="(item) in debug" class="mb-2">
                    <pre class="bg-gray-100 p-3 rounded overflow-auto">{{ item }}</pre>
                  </div>
                </div>

                <div v-if="age !== null || gender !== null" class="mt-4 text-center">
                  <div>年龄：{{ ageDisplay }}</div>
                  <div>性别：{{ genderDisplay }}</div>
                </div>

                <v-switch v-model="saveConsent" color="primary" hide-details class="mt-4"
                  label="允许 littlew.top 将此信息与你的账户关联" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const cameraActive = ref(false)
const stream = ref(null)
const photoData = ref(null)
const photoBlob = ref(null)
const loading = ref(false)
const debug = ref('')
const errorMsg = ref('')
const saveConsent = ref(true)
const age = ref(null)
const gender = ref(null)

const video = ref(null)

async function startCamera() {
  try {
    errorMsg.value = ''
    if (navigator.permissions && navigator.permissions.query) {
      await navigator.permissions.query({ name: 'camera' })
    }
    stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    cameraActive.value = true
    await nextTick()
    const videoEl = video.value
    videoEl.srcObject = stream.value
    await videoEl.play().catch(() => { })

  } catch (e) {
    errorMsg.value = e
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((t) => t.stop())
    stream.value = null
  }
  cameraActive.value = false
}

function takePhoto() {
  try {
    errorMsg.value = ''
    const videoEl = video.value
    age.value = null
    gender.value = null
    const canvas = document.createElement('canvas')
    canvas.width = videoEl.videoWidth || 320
    canvas.height = videoEl.videoHeight || 240
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      photoBlob.value = blob
      photoData.value = URL.createObjectURL(blob)
    }, 'image/jpeg', 0.9)
    stopCamera()
  } catch (e) {
    errorMsg.value = e
  }
}

function retake() {
  try {
    if (photoData.value) URL.revokeObjectURL(photoData.value)
    photoData.value = null
    photoBlob.value = null
    errorMsg.value = ''
    age.value = null
    gender.value = null
    startCamera()
  } catch (e) {
    errorMsg.value = e
  }
}

function onFileChange(e) {
  try {
    errorMsg.value = ''
    const file = e.target.files && e.target.files[0]
    if (!file) throw new Error('未选择文件')
    photoBlob.value = file
    photoData.value = URL.createObjectURL(file)
    age.value = null
    gender.value = null
  } catch (e) {
    errorMsg.value = e
  }
}

async function uploadPhoto() {
  stopCamera()
  if (!photoBlob.value) {
    errorMsg.value = '请先拍照或选择图片'
    return
  }
  loading.value = true
  errorMsg.value = ''
  debug.value = ''
  try {
    const form = new FormData()
    form.append('face', photoBlob.value, 'selfie.jpg')
    let url = 'https://api.littlew.top/age'
    const params = []
    if (saveConsent.value) params.push('save=true')
    if (params.length) url += '?' + params.join('&')
    const resp = await fetch(url, { method: 'POST', body: form }, { credentials: 'include' })
    const text = await resp.text()
    try {
      const data = JSON.parse(text)
      debug.value = data.raw || ''
      age.value = typeof data.age === 'number' ? data.age : -1
      gender.value = typeof data.gender === 'number' ? data.gender : -1
    } catch (err) {
      debug.value = text
      age.value = -1
      gender.value = -1
    }
  } catch (e) {
    errorMsg.value = e
  } finally {
    loading.value = false
  }
}

const ageDisplay = computed(() => {
  if (age.value === null) return '未知'
  return age.value > -1 ? String(age.value) : '未知'
})

const genderDisplay = computed(() => {
  if (gender.value === null) return '未知'
  if (gender.value === 0) return 'Female'
  if (gender.value === 1) return 'Male'
  return '未知'
})

onBeforeUnmount(() => stopCamera())
onMounted(() => startCamera())
</script>
