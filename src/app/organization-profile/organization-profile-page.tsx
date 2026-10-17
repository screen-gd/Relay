import { UserBillingProfile } from "@/components/subscription-plans";
import {
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";

export function OrganizationProfilePage() {
  return (
    <WorkspacePage family="administration">
      <PageHeader title="Organization profile" />
      <PageContent>
        <UserBillingProfile />
      </PageContent>
    </WorkspacePage>
  );
}
