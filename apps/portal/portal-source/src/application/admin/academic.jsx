import { AdminProfileEditor } from "./profile-editors.jsx";

export function AdminPerfilAcademico({ client, onRefresh }) {
  return <AdminProfileEditor client={client} onRefresh={onRefresh} academicOnly />;
}
