import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import OnboardingPage from "../page";

describe("Onboarding page", () => {
  it("submits minimal tenant information", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: "ready", tenantId: "syston-town-tigers" }),
    });
    const originalFetch = global.fetch;
    // @ts-expect-error -- jsdom environment allows overriding for tests
    global.fetch = fetchMock;

    try {
      render(<OnboardingPage />);

      await user.type(screen.getByPlaceholderText(/Club name/i), "Syston Town Tigers");
      await user.type(screen.getByPlaceholderText(/Tenant ID \(slug\)/i), "syston-town-tigers");
      await user.click(screen.getByRole("button", { name: /Provision/i }));

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tenants",
        expect.objectContaining({
          method: "POST",
        }),
      );

      expect(await screen.findByText(/syston-town-tigers/)).toBeInTheDocument();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
