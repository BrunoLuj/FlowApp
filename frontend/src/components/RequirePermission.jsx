import React from "react";
import { Navigate } from "react-router-dom";
import useStore from "../store";

const RequirePermission = ({ permission, children }) => {
  const permissions = useStore((state) => state.permissions);
  if (!permissions.includes(permission)) {
    return <Navigate to="/forbidden" replace />;
  }
  return children;
};

export default RequirePermission;
