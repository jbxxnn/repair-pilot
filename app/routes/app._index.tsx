import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const search = new URL(request.url).search;
  return { search };
};

export default function AppIndexRedirect() {
  const { search } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/app/tickets${search}`, { replace: true });
  }, [navigate, search]);

  return (
    <s-page heading="Loading">
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <s-spinner size="large" />
      </div>
    </s-page>
  );
}
