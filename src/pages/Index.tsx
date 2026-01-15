import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl mb-6">
            <Smartphone className="w-10 h-10 text-primary-foreground" />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            MPESA Transaction
            <span className="block text-primary">Monitoring Hub</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track, parse, and manage your MPESA messages in real-time. Forward SMS from your Android device and access them from anywhere.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8">
              <Link to="/dashboard">View Dashboard</Link>
            </Button>
          </div>
        </div>




      </div>
    </div>
  );
};

export default Index;
