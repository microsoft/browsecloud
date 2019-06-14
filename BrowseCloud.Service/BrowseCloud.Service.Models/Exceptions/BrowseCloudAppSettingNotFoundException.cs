// <copyright file="BrowseCloudAppSettingNotFoundException.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Exceptions
{
    using System;

    /// <summary>
    /// App Setting Not Found Exception. When an expected Azure App Setting or Configuration item is not present.
    /// </summary>
    public class BrowseCloudAppSettingNotFoundException : BrowseCloudServiceException
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudAppSettingNotFoundException"/> class.
        /// App Setting Not Found Exception. When an expected Azure App Setting or Configuration item is not present.
        /// </summary>
        public BrowseCloudAppSettingNotFoundException()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudAppSettingNotFoundException"/> class.
        /// App Setting Not Found Exception. When an expected Azure App Setting or Configuration item is not present.
        /// </summary>
        /// <param name="message">Exception Message</param>
        public BrowseCloudAppSettingNotFoundException(string message)
            : base(message)
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudAppSettingNotFoundException"/> class.
        /// App Setting Not Found Exception. When an expected Azure App Setting or Configuration item is not present.
        /// </summary>
        /// <param name="message">Exception Message</param>
        /// <param name="inner">Inner Exception</param>
        public BrowseCloudAppSettingNotFoundException(string message, Exception inner)
            : base(message, inner)
        {
        }
    }
}
