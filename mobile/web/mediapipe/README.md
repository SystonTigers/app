# Background remover model

`selfie_multiclass_256x256.tflite`: Google MediaPipe's multi-class selfie
segmentation model (Apache 2.0), from
https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite

Used by `src/services/cutout.web.ts` to take the background out of player
photos for the goal-graphic cut-outs. `scripts/copy-mediapipe.mjs` copies it
into web builds with the MediaPipe library and WebAssembly from node_modules.
