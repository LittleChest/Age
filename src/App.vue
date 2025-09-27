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
                  class="rounded-lg bg-black"
                  v-show="cameraActive && !photoData"
                  ></video>

                  <img
                  v-if="photoData"
                  :src="photoData"
                  alt="预览"
                  width="320"
                  height="240"
                  class="rounded-lg object-cover"
                  />
                </div>

                <div v-if="errorMsg" class="text-red-600 text-center mt-2">
                  {{ errorMsg }}
                </div>

                <div class="mt-4 flex gap-3 justify-center">
                  <v-btn color="primary" @click="takePhoto" :disabled="!cameraActive" v-if="!photoData"
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

                  <v-switch v-model="saveConsent" inset hide-details color="primary" class="mt-4" label="允许 littlew.top 将此信息与你的账户关联" />

                <v-progress-linear
                  :indeterminate="true"
                  v-if="loading"
                  class="mt-4"
                ></v-progress-linear>

                <div v-if="debug" class="mt-4">
                  <div>调试信息</div>
                  <pre class="bg-gray-100 p-3 rounded overflow-auto">{{ debug }}</pre>
                </div>

                <div v-if="age !== null || gender !== null" class="mt-4 text-center">
                  <div>年龄：{{ ageDisplay }}</div>
                  <div>性别：{{ genderDisplay }}</div>
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
      debug: '',
      errorMsg: '',
      saveConsent: true,
      age: null,
      gender: null,
    }
  },
  methods: {
    async startCamera() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        this.cameraActive = true
        await this.$nextTick()
        const videoEl = this.$refs.video
        videoEl.srcObject = this.stream
        await videoEl.play().catch(() => {})
      } catch (e) {
        this.errorMsg = e
      }
    },
    takePhoto() {
      try {
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
      } catch (e) {
        this.errorMsg = e
      }
    },
    retake() {
      try {
        if (this.photoData) URL.revokeObjectURL(this.photoData)
        this.photoData = null
        this.photoBlob = null
        this.startCamera()
      } catch (e) {
        this.errorMsg = e
      }
    },
    stopCamera() {
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop())
        this.stream = null
      }
      this.cameraActive = false
    },
    onFileChange(e) {
      try {
        const file = e.target.files && e.target.files[0]
        this.photoBlob = file
        this.photoData = URL.createObjectURL(file)
      } catch (e) {
        this.errorMsg = e
      }
    },
    async uploadPhoto() {
      if (!this.photoBlob) {
        this.errorMsg = '请先拍照或选择图片'
        return
      }
      this.loading = true
      this.debug = ''
      try {
        const form = new FormData()
        form.append('face', this.photoBlob, 'selfie.jpg')

        let url = 'https://api.littlew.top/age'
        if (this.saveConsent) url += '?save=true'
        const resp = await fetch(url, {
          method: 'POST',
          body: form,
        }, {
          credentials: 'include',
        })

        const text = await resp.text()
        try {
          const data = JSON.parse(text)
          this.debug = data.raw
          this.age = typeof data.age === 'number' ? data.age : -1
          this.gender = typeof data.gender === 'number' ? data.gender : -1
        } catch (e) {
          this.debug = text
          this.age = -1
          this.gender = -1
        }
      } catch (e) {
        this.errorMsg = e
      } finally {
        this.loading = false
      }
    },
  },
  computed: {
    ageDisplay() {
      if (this.age === null) return '未知'
      return this.age > -1 ? String(this.age) : '未知'
    },
    genderDisplay() {
      if (this.gender === null) return '未知'
      if (this.gender === 0) return 'Female'
      if (this.gender === 1) return 'Male'
      return '未知'
    },
  },
  beforeUnmount() {
    this.stopCamera()
  },
  mounted() {
    this.startCamera()
  }
}
</script>
