/**
 * Playwright executor — actually drives a headless Chromium browser to
 * submit an appeal on a county portal.
 *
 * This file is loaded dynamically (import("./playwrightExecutor")) so the
 * core server, the test suite, and the tRPC bundle never pull Playwright
 * into their dependency graph. The executor is only imported when a
 * filing job is ready to run in production.
 *
 * Deployment notes:
 *   - Requires `playwright` in runtime deps (devDep only is fine for now
 *     because the import is lazy; move to deps before production).
 *   - Requires the Chromium browser: `pnpm exec playwright install chromium`.
 *   - The container must have the shared libs Playwright needs (see
 *     playwright docs). For Alpine base images, use the `mcr.microsoft.com/
 *     playwright:v<VERSION>` image instead of alpine.
 */

import type { ResolvedStep } from "./filingRecipeEngine";

export interface ExecutionResult {
  success: boolean;
  portalConfirmationNumber?: string;
  finalScreenshot?: Buffer;
  executionLog: ExecutionLogEntry[];
  errorMessage?: string;
  captureds: Record<string, string>;
}

export interface ExecutionLogEntry {
  stepIndex: number;
  action: string;
  selector?: string;
  startedAt: string; // ISO timestamp
  durationMs: number;
  outcome: "ok" | "skipped" | "failed";
  error?: string;
}

export interface ExecuteOptions {
  reportPdfBuffer?: Buffer;
  reportPdfFilename?: string;
  timeoutMs?: number;
  // When true, throw if the recipe contains `pauseForCaptcha`. For fully
  // automated runs. Otherwise, we surface a captcha status.
  failOnCaptcha?: boolean;
}

export async function executeRecipe(
  steps: ResolvedStep[],
  options: ExecuteOptions = {}
): Promise<ExecutionResult> {
  const log: ExecutionLogEntry[] = [];
  const captureds: Record<string, string> = {};

  let playwright: typeof import("playwright") | null = null;
  try {
    playwright = await import("playwright");
  } catch (err) {
    return {
      success: false,
      executionLog: log,
      captureds,
      errorMessage:
        "Playwright runtime is not installed. Install with `pnpm exec playwright install chromium`.",
    };
  }

  const tmpPdfPath = await maybeWriteReportToDisk(options.reportPdfBuffer, options.reportPdfFilename);
  const browser = await playwright.chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64; AppraiseAI/1.0 Filing Agent) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(options.timeoutMs ?? 15_000);

  let finalScreenshot: Buffer | undefined;
  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const startedAt = new Date();
      const t0 = Date.now();
      try {
        switch (step.action) {
          case "goto":
            await page.goto(step.url, { waitUntil: "domcontentloaded" });
            break;
          case "waitFor":
            await page.waitForSelector(step.selector, { timeout: step.timeoutMs });
            break;
          case "waitForURL":
            await page.waitForURL(new RegExp(step.pattern), { timeout: step.timeoutMs });
            break;
          case "fill":
          case "fillValue": {
            const value =
              step.action === "fill" ? (step as any).resolvedValue : (step as any).value;
            if (value == null || value === "") {
              if (step.optional) break;
              throw new Error(`No value for fill step on ${step.selector}`);
            }
            await page.fill(step.selector, String(value));
            break;
          }
          case "click":
            await page.click(step.selector);
            break;
          case "selectOption":
            await page.selectOption(step.selector, step.value);
            break;
          case "setRadio":
            await page.check(`${step.selector}[value="${step.value}"]`);
            break;
          case "setCheckbox":
            if (step.checked) await page.check(step.selector);
            else await page.uncheck(step.selector);
            break;
          case "uploadFile":
            if (!tmpPdfPath) {
              if (step.optional) break;
              throw new Error("Upload step reached but no report PDF was provided");
            }
            await page.setInputFiles(step.selector, tmpPdfPath);
            break;
          case "captureText": {
            const text = (await page.textContent(step.selector)) ?? "";
            captureds[step.to] = text.trim();
            break;
          }
          case "screenshot": {
            const buf = await page.screenshot({ fullPage: step.fullPage ?? true });
            captureds[step.to] = `screenshot:${step.to}`;
            if (step.to === "result.finalScreenshot") finalScreenshot = buf;
            break;
          }
          case "assertText": {
            const text = (await page.textContent(step.selector)) ?? "";
            if (!text.includes(step.contains)) {
              throw new Error(
                `Assertion failed on ${step.selector}: expected to contain "${step.contains}", got "${text.slice(0, 120)}"`
              );
            }
            break;
          }
          case "pauseForCaptcha":
            if (options.failOnCaptcha) {
              throw new Error("Captcha encountered and failOnCaptcha is set");
            }
            await page.waitForSelector(step.selector, {
              timeout: step.timeoutMs ?? 120_000,
              state: "hidden",
            });
            break;
          case "wait":
            await page.waitForTimeout(step.ms);
            break;
          default:
            throw new Error(`Unknown step action: ${(step as any).action}`);
        }
        log.push({
          stepIndex: i,
          action: (step as any).action,
          selector: (step as any).selector,
          startedAt: startedAt.toISOString(),
          durationMs: Date.now() - t0,
          outcome: "ok",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if ((step as any).optional) {
          log.push({
            stepIndex: i,
            action: (step as any).action,
            selector: (step as any).selector,
            startedAt: startedAt.toISOString(),
            durationMs: Date.now() - t0,
            outcome: "skipped",
            error: message,
          });
          continue;
        }
        log.push({
          stepIndex: i,
          action: (step as any).action,
          selector: (step as any).selector,
          startedAt: startedAt.toISOString(),
          durationMs: Date.now() - t0,
          outcome: "failed",
          error: message,
        });
        await browser.close().catch(() => void 0);
        return {
          success: false,
          executionLog: log,
          captureds,
          errorMessage: message,
        };
      }
    }
  } finally {
    await browser.close().catch(() => void 0);
    if (tmpPdfPath) {
      try {
        const { unlink } = await import("fs/promises");
        await unlink(tmpPdfPath);
      } catch {
        // best effort
      }
    }
  }

  return {
    success: true,
    executionLog: log,
    captureds,
    portalConfirmationNumber: captureds["result.confirmationNumber"],
    finalScreenshot,
  };
}

async function maybeWriteReportToDisk(
  buffer: Buffer | undefined,
  filename?: string
): Promise<string | null> {
  if (!buffer) return null;
  const { writeFile } = await import("fs/promises");
  const { tmpdir } = await import("os");
  const { join } = await import("path");
  const name = filename || `appraise-report-${Date.now()}.pdf`;
  const path = join(tmpdir(), name.replace(/[^\w.-]/g, "_"));
  await writeFile(path, buffer);
  return path;
}
