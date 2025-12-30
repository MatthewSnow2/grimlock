"""HTTP client for n8n webhook integration."""

import httpx

from grimlock_api.config import get_settings

settings = get_settings()


class N8NClient:
    """Client for calling n8n webhooks."""

    def __init__(self):
        self.base_url = settings.n8n_webhook_base_url
        self.timeout = 30.0

    async def trigger_build(self, prd_file: str) -> dict:
        """Trigger sprint initiator workflow in n8n.

        Args:
            prd_file: Name of the PRD file to build

        Returns:
            Response from n8n workflow
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/grimlock/start",
                json={"prd_file": prd_file},
            )
            response.raise_for_status()
            return response.json()

    async def trigger_escalation(
        self, severity: str, message: str, context: dict | None = None
    ) -> dict:
        """Trigger escalation handler in n8n.

        Args:
            severity: WARNING, PAUSE, or EMERGENCY
            message: Error message
            context: Additional context

        Returns:
            Response from n8n workflow
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/grimlock/escalate",
                json={
                    "severity": severity,
                    "error_msg": message,
                    "context": context or {},
                },
            )
            response.raise_for_status()
            return response.json()

    async def health_check(self) -> bool:
        """Check if n8n is reachable.

        Returns:
            True if n8n responds successfully
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Try the health endpoint if available, otherwise just check base
                response = await client.get(f"{self.base_url}/grimlock/health")
                return response.status_code == 200
        except Exception:
            return False
