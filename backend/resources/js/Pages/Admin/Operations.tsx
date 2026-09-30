import { usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import RoleOperationsPage, { type RoleOperationsProps } from '../Operations/RoleOperationsPage';

export default function AdminOperations() {
    const props = usePage<RoleOperationsProps>().props;
    return <AdminLayout title={props.title}><RoleOperationsPage {...props} kind="admin" /></AdminLayout>;
}
