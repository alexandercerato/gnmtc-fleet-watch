import { createRoot } from "react-dom/client";
import FleetDashboard from "../app/fleet-dashboard";
import "../app/globals.css";
import "../app/theme.css";

createRoot(document.getElementById("root")!).render(<FleetDashboard staticMode />);
