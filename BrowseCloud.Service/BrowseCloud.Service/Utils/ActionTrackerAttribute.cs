// <copyright file="ActionTrackerAttribute.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Utils
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics.Contracts;
    using System.Linq;
    using Microsoft.ApplicationInsights;
    using Microsoft.AspNetCore.Mvc.Filters;

    /// <summary>
    /// Logs start and finish request telemetry, and setups activity ID on start.
    /// </summary>
    public sealed class ActionTrackerAttribute : ActionFilterAttribute
    {
        /// <summary>
        /// Logs finished request and exception if there was one.
        /// </summary>
        /// <param name="context">Action Executed Context</param>
        public override void OnActionExecuted(ActionExecutedContext context)
        {
            Contract.Requires(context != null, nameof(context));

            var telemetryClient = new TelemetryClient();

            if (context.Exception != null)
            {
                Dictionary<string, string> properties = new Dictionary<string, string>
                {
                    { "Exception.Message", context.Exception.Message },
                    { "Exception.StackTrace", context.Exception.StackTrace },
                };

                telemetryClient.TrackEvent("BrowseCloud.Service.Finished.Exception", properties);
                telemetryClient.TrackException(context.Exception);
            }
            else
            {
                telemetryClient.TrackEvent("BrowseCloud.Service.Finished.Success");
            }

            base.OnActionExecuted(context);
        }

        /// <summary>
        /// Sets up root activity ID and logs start request telemetry.
        /// </summary>
        /// <param name="context">Action Executed Context</param>
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            Contract.Requires(context != null, nameof(context));

            // Generate root activity id if there is none.
            var request = context.HttpContext.Request;
            var rootActivityId = request.Headers["x-bc-root-activity-id"].FirstOrDefault();
            if (rootActivityId == null)
            {
                request.Headers.Add("x-bc-root-activity-id", Guid.NewGuid().ToString());
            }

            var telemetryClient = new TelemetryClient();

            telemetryClient.TrackEvent("BrowseCloud.Service.Started");

            base.OnActionExecuting(context);
        }
    }
}
