import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import SEO from "../components/SEO";

const NotFound = () => {
  return (
    <>
      <SEO
        title="Page Not Found – ArenaPulse"
        description="Oops! The page you are looking for does not exist. Return to the ArenaPulse homepage and explore esports tournaments and scrims."
        keywords="404 page, not found, broken link"
        canonical="https://thearenapulse.xyz/"
      />

      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gaming-purple mb-4">404</h1>
          <h2 className="text-2xl font-bold text-white mb-4">Page Not Found</h2>
          <p className="text-gray-400 mb-8">
            The page you're looking for doesn't exist.
          </p>
          <div className="flex space-x-4 justify-center">
            <Link
              to="/"
              className="btn-primary flex items-center justify-between"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn-secondary flex items-center justify-between"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;