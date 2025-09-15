import CandidateVideo from "./CandidateVideo";
import Navbar from "./Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  return (
    <div>
      <Navbar />
      <div className="mt-4 flex justify-center">
        <Tabs
          defaultValue="candidate-video"
          className="w-screen flex items-center"
        >
          <TabsList className="bg-zinc-200 ">
            <TabsTrigger className="sm:px-6" value="candidate-video">
              Candidate’s video
            </TabsTrigger>
            <TabsTrigger className="sm:px-6" value="upload-video">
              Upload Video
            </TabsTrigger>
            <TabsTrigger className="sm:px-6" value="review-live">
              Review Live
            </TabsTrigger>
          </TabsList>
          <TabsContent value="candidate-video">
            <div className="max-w-7xl">
              <CandidateVideo />
            </div>
          </TabsContent>
          <TabsContent value="upload-video">
            <div className="md:w-[1000px]">Your table here 2</div>
          </TabsContent>
          <TabsContent value="review-live">
            <div className="md:w-[1000px]">Your table here 3</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
