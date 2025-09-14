import logo from "../assets/logo.png";

const Navbar = () => {
  return (
    <header >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-blue-500 rounded-lg">
              <img src={logo} alt="logo" width={40} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Focus Guard
              </h1>
              <p className="text-sm text-gray-600">
                Focus & Object Detection for Interviews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 justify-center">
                <div className="rounded-full p-1 bg-green-600"></div>
                <p>All systems ready</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
