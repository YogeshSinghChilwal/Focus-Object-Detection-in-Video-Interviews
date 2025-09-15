import { useNavigate } from "react-router-dom";
import demo from "@/assets/videos/demo.mp4";

const Demo = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-6">
      <button
        onClick={() => navigate("/home")}
        className="mb-6 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Focus Guard – Focus & Object Detection for Interviews
      </h1>

      <video
        className="w-full max-w-2xl rounded-xl shadow-lg border"
        controls
        src={demo}
      >
        <source src="/videos/focus-guard-demo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default Demo;
