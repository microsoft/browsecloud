// <copyright file="RawRequestBodyFormatter.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Utils
{
    using System.Diagnostics.Contracts;
    using System.IO;
    using System.Threading.Tasks;
    using Microsoft.AspNetCore.Mvc.Formatters;
    using Microsoft.Net.Http.Headers;

    /// <summary>
    /// Handles text/plain input types.
    /// </summary>
    public class RawRequestBodyFormatter : InputFormatter
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="RawRequestBodyFormatter"/> class.
        /// </summary>
        public RawRequestBodyFormatter()
        {
            this.SupportedMediaTypes.Add(new MediaTypeHeaderValue("text/plain"));
            this.SupportedMediaTypes.Add(new MediaTypeHeaderValue("application/octet-stream"));
        }

        /// <summary>
        /// Allow text/plain, application/octet-stream and no content type to
        /// be processed.
        /// </summary>
        /// <param name="context">InputFormatterContext</param>
        /// <returns></returns>
        public override bool CanRead(InputFormatterContext context)
        {
            Contract.Requires(context != null, nameof(context));

            var contentType = context.HttpContext.Request.ContentType;
            if (string.IsNullOrEmpty(contentType) || contentType == "text/plain" ||
                contentType == "application/octet-stream")
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Handle text/plain or no content type for string results.
        /// </summary>
        /// <param name="context">InputFormatterContext</param>
        /// <returns></returns>
        public override async Task<InputFormatterResult> ReadRequestBodyAsync(InputFormatterContext context)
        {
            Contract.Requires(context != null, nameof(context));

            var request = context.HttpContext.Request;
            var contentType = context.HttpContext.Request.ContentType;

            if (string.IsNullOrEmpty(contentType) || contentType == "text/plain")
            {
                using (var reader = new StreamReader(request.Body))
                {
                    var content = await reader.ReadToEndAsync();
                    return await InputFormatterResult.SuccessAsync(content);
                }
            }

            if (contentType == "application/octet-stream")
            {
                using (var ms = new MemoryStream(2048))
                {
                    await request.Body.CopyToAsync(ms);
                    var content = ms.ToArray();
                    return await InputFormatterResult.SuccessAsync(content);
                }
            }

            return await InputFormatterResult.FailureAsync();
        }
    }
}
