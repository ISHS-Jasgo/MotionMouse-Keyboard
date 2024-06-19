import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, FilesetResolver, DrawingUtils, GestureRecognizer } = vision;

const demosSection = document.getElementById("demos");
const videoBlendShapes = document.getElementById("video-blend-shapes");
let faceLandmarker;
let gestureRecognizer;
let runningMode = "VIDEO";
let enableWebcamButton;
let webcamRunning = false;
const videoWidth = 480;
var socket = io("localhost:3000");

async function createFaceLandmarker() {
    const fileResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(fileResolver, {
    baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
    },
    outputFaceBlendshapes: true,
    runningMode,
    numFaces: 1
    });
    demosSection.classList.remove("invisible");
}
createFaceLandmarker();

const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 1
    });
    demosSection.classList.remove("invisible");
  };
  createGestureRecognizer();

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");

const canvasCtx = canvasElement.getContext("2d");

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
    if (!faceLandmarker) {
        console.log("Wait! faceLandmarker not loaded yet.");
    return;
    }

    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }

    // getUsermedia parameters.
    const constraints = {
        video: true
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
    // flip the video horizontally
    video.style.transform = "scaleX(-1)";
    canvasElement.style.transform = "scaleX(-1)";
    });
}

let lastVideoTime = -1;
let results1 = undefined;
let results2 = undefined;
const drawingUtils = new DrawingUtils(canvasCtx);

let enableClick = true;
async function predictWebcam() {
    const radio = video.videoHeight / video.videoWidth;
    video.style.width = videoWidth + "px";
    video.style.height = videoWidth * radio + "px";
    canvasElement.style.width = videoWidth + "px";
    canvasElement.style.height = videoWidth * radio + "px";
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    let startTimeMs = performance.now();

    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results1 = faceLandmarker.detectForVideo(video, startTimeMs);
        results2 = gestureRecognizer.recognizeForVideo(video, startTimeMs);
    }
    if (results1.faceLandmarks) {
        for (const landmarks of results1.faceLandmarks) {
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_TESSELATION,
            { color: "#C0C0C070", lineWidth: 1 }
            );
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
            { color: "#FF3030" }
            );
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
            { color: "#FF3030" }
            );
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
            { color: "#30FF30" }
            );
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
            { color: "#30FF30" }
            );
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
            { color: "#E0E0E0" }
            );
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LIPS,
            { color: "#E0E0E0" }
            );
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
            { color: "#FF3030" }
            );
            drawingUtils.drawConnectors(
            landmarks,
            FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
            { color: "#30FF30" }
            );
        }
    }
    drawBlendShapes(videoBlendShapes, results1.faceBlendshapes);
    let x = 0;
    let y = 0;
    if (results2.landmarks) {
        for (let i = 0; i < results2.landmarks.length; i++) {
            let landmarks = results2.landmarks[i];
            drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                  color: "#00FF00",
                  lineWidth: 5
                }
            );
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
            // sort landmarks by y position
            landmarks.sort((a, b) => a.y - b.y);
            x = landmarks[0].x * video.videoWidth;
            y = landmarks[0].y * video.videoHeight;
            // draw a circle at the top landmark
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 10, 0, 2 * Math.PI);
            canvasCtx.fillStyle = "blue";
            canvasCtx.fill();
            canvasCtx.closePath();
        }
      }
      if (results2.gestures.length > 0) {
        const categoryName = results2.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results2.gestures[0][0].score * 100).toFixed(2);
        const handedness = results2.handednesses[0][0].displayName;
        if (categoryName === "Pointing_Up" && categoryScore > 70) {
            console.log("Pointing Up");
            socket.emit("mouse", { x: (window.innerWidth - x / video.videoWidth * window.innerWidth) * 1.03, y: (y / video.videoHeight * window.innerHeight) * 1.03});
        }
        if (categoryName === "Closed_Fist" && categoryScore > 70) {
            if (enableClick) {
                console.log("Closed Fist");
                socket.emit("lclick", "click")
                enableClick = false;
            }
        }
        if (categoryName === "Thumb_Up" && categoryScore > 70) {
            if (enableClick) {
                console.log("Thumb Up");
                socket.emit("rclick", "scroll")
                enableClick = false;
            }
        }
        if (categoryName === "Open_Palm" && categoryScore > 50) {
            enableClick = true;
        }
      } 

    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
    }
}

function drawBlendShapes(el, blendShapes) {
    if (!blendShapes.length) {
    return;
    }

    let htmlMaker = "";
    blendShapes[0].categories.map((shape) => {
        if (shape.score < 0.2) {
            return;
        }
        if (shape.categoryName === "jawOpen" && shape.score > 0.7) {
            socket.emit("jawOpen", "jawOpen");
        }
    });
    el.innerHTML = htmlMaker;
}