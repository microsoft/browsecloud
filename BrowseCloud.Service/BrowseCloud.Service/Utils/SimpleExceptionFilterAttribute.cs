// <copyright file="SimpleExceptionFilterAttribute.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Utils
{
    using System.Diagnostics.Contracts;
    using System.Net;
    using BrowseCloud.Service.Models.Exceptions;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.Mvc.Filters;

    /// <summary>
    /// Custom exception handling.
    /// </summary>
    public sealed class SimpleExceptionFilterAttribute : ExceptionFilterAttribute
    {
        /// <summary>
        /// Sets the response for an exception.
        /// </summary>
        /// <param name="context">Exception Context</param>
        public override void OnException(ExceptionContext context)
        {
            Contract.Requires(context != null, nameof(context));

            HttpStatusCode responseCode = HttpStatusCode.InternalServerError;
            string message = "An unexpected error occured";

            if (context.Exception is BrowseCloudServiceException)
            {
                if (context.Exception is BrowseCloudValidationException)
                {
                    responseCode = HttpStatusCode.BadRequest;
                }
                else if (context.Exception is BrowseCloudPageNotFoundException)
                {
                    responseCode = HttpStatusCode.NotFound;
                }
                else if (context.Exception is BrowseCloudPermissionsDeniedException)
                {
                    responseCode = HttpStatusCode.Forbidden;
                }
                else
                {
                    responseCode = HttpStatusCode.InternalServerError;
                }

                message = context.Exception.Message;
            }

            context.HttpContext.Response.StatusCode = (int)responseCode;
            context.Result = new JsonResult(new { Message = message });

            base.OnException(context);
        }
    }
}
