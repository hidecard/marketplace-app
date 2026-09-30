import { usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import RoleOperationsPage, { type RoleOperationsProps } from '../Operations/RoleOperationsPage';

export default function SellerOperations() {
    const props = usePage<RoleOperationsProps>().props;
    return <AppLayout><RoleOperationsPage {...props} kind="seller" /></AppLayout>;
}
