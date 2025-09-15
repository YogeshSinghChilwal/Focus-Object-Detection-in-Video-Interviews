import { Routes, Route, Navigate } from "react-router-dom";
import Demo from "./components/Demo";
import HomePage from "./components/HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="*" element={<Navigate to={"/"} />} />
    </Routes>
  );
}

export default App;
