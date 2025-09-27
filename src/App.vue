<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6">
            <v-card class="pa-6" elevation="6">
              <v-card-title class="justify-center">年龄验证</v-card-title>
              <v-card-text>
                <div class="flex justify-center text-center">
                  <video
                    ref="video"
                    autoplay
                    playsinline
                    muted
                    width="320"
                    height="240"
                    style="border-radius: 8px; background: #000"
                    v-show="cameraActive && !photoData"
                  ></video>

                  <img
                    v-if="photoData"
                    :src="photoData"
                    alt="自拍预览"
                    width="320"
                    height="240"
                    style="border-radius: 8px; object-fit: cover"
                  />
                </div>

                <div class="mt-4 flex gap-3 justify-center">
                  <v-btn color="primary" @click="startCamera" v-if="!cameraActive"
                    >打开摄像头</v-btn
                  >
                  <v-btn color="primary" @click="takePhoto" v-if="cameraActive && !photoData"
                    >拍照</v-btn
                  >
                  <v-btn color="secondary" @click="retake" v-if="photoData">重拍</v-btn>
                  <v-btn color="success" @click="uploadPhoto" :disabled="!photoBlob">上传</v-btn>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      @change="onFileChange"
                      class="hidden"
                      ref="fileInput"
                    />
                    <v-btn color="info" @click="$refs.fileInput.click()">从相册选择</v-btn>
                  </label>
                </div>

                <v-progress-linear
                  :indeterminate="true"
                  v-if="loading"
                  class="mt-4"
                ></v-progress-linear>

                <div v-if="responseText" class="mt-4">
                  <div>调试信息</div>
                  <pre class="bg-gray-100 p-3 rounded overflow-auto">{{ responseText }}</pre>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      cameraActive: false,
      stream: null,
      photoData: null,
      photoBlob: null,
      loading: false,
      responseText: '',
    }
  },
  methods: {
    async startCamera() {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      this.cameraActive = true
      await this.$nextTick()
      const videoEl = this.$refs.video
      videoEl.srcObject = this.stream
      await videoEl.play().catch(() => {})
    },
    takePhoto() {
      const video = this.$refs.video
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          this.photoBlob = blob
          this.photoData = URL.createObjectURL(blob)
        },
        'image/jpeg',
        0.9
      )
      this.stopCamera()
    },
    retake() {
      if (this.photoData) URL.revokeObjectURL(this.photoData)
      this.photoData = null
      this.photoBlob = null
      this.startCamera()
    },
    stopCamera() {
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop())
        this.stream = null
      }
      this.cameraActive = false
    },
    onFileChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      this.photoBlob = file
      this.photoData = URL.createObjectURL(file)
    },
    async uploadPhoto() {
      if (!this.photoBlob) return alert('请先拍照或选择图片')
      this.loading = true
      this.responseText = ''
      try {
        const form = new FormData()
        form.append('face', this.photoBlob, 'selfie.jpg')

        const resp = await fetch('https://api.littlew.top/age', {
          method: 'POST',
          body: form,
        })

        const text = await resp.text()
        try {
          const obj = JSON.parse(text)
          this.responseText = JSON.stringify(obj, null, 2)
        } catch (e) {
          this.responseText = text
        }
      } catch (e) {
        this.responseText = e.message
      } finally {
        this.loading = false
      }
    },
  },
  beforeUnmount() {
    this.stopCamera()
  },
}
</script>
