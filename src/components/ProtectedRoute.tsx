import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { auth } from "../services/firebase";

const ProtectedRoute = () => {
  const user = auth.currentUser;
  return user ? <Outlet /> : <Navigate to="/auth" />;
};

export default ProtectedRoute;