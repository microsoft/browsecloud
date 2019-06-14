// <copyright file="RequestDataTelemetryInitializer.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Utils
{
    using System.Diagnostics.Contracts;
    using System.Linq;
    using Microsoft.ApplicationInsights.Channel;
    using Microsoft.ApplicationInsights.Extensibility;
    using Microsoft.AspNetCore.Http;

    /// <summary>
    /// Sets global telemetry attributes for every log item.
    /// </summary>
    public class RequestDataTelemetryInitializer : ITelemetryInitializer
    {
        private readonly IHttpContextAccessor httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="RequestDataTelemetryInitializer"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">Http Context</param>
        public RequestDataTelemetryInitializer(IHttpContextAccessor httpContextAccessor)
        {
            Contract.Requires(httpContextAccessor != null, nameof(httpContextAccessor));

            this.httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Sets global telemetry attributes for every log item.
        /// </summary>
        /// <param name="telemetry">Telemetry Item</param>
        public void Initialize(ITelemetry telemetry)
        {
            Contract.Requires(telemetry != null, nameof(telemetry));

            var context = this.httpContextAccessor.HttpContext;

            if (context != null)
            {
                if (context.User?.Identity?.Name != null)
                {
                    telemetry.Context.GlobalProperties["User.Name"] = this.httpContextAccessor.HttpContext.User.Identity.Name;
                    telemetry.Context.User.Id = this.httpContextAccessor.HttpContext.User.Identity.Name;
                }

                var request = context.Request;

                var rootActivityId = request?.Headers["x-bc-root-activity-id"].FirstOrDefault();
                if (rootActivityId != null)
                {
                    telemetry.Context.GlobalProperties["RootActivityId"] = rootActivityId;
                }

                telemetry.Context.GlobalProperties["Request.Route"] = request?.Path;
                telemetry.Context.GlobalProperties["Request.Method"] = request?.Method;
            }
        }
    }
}
