export function SampleDataBanner() {
  return (
    <div className="sample-banner">
      ⚠ SAMPLE DATA — this deployment is showing a synthetic price series (not real market history), generated
      because the build environment had no network access to Yahoo Finance. Run <code>scripts/update_data.py</code>{" "}
      with network access to replace it with real historical data. See README for details.
    </div>
  );
}
