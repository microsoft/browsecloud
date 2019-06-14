// <copyright file="BrowseCloudPageNotFoundException.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Exceptions
{
    using System;

    /// <summary>
    /// When a document or job or any other entity is not found.
    /// </summary>
    public class BrowseCloudPageNotFoundException : BrowseCloudServiceException
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudPageNotFoundException"/> class.
        /// When a document or job or any other entity is not found.
        /// </summary>
        public BrowseCloudPageNotFoundException()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudPageNotFoundException"/> class.
        /// When a document or job or any other entity is not found.
        /// </summary>
        /// <param name="message">Exception Message</param>
        public BrowseCloudPageNotFoundException(string message)
            : base(message)
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudPageNotFoundException"/> class.
        /// When a document or job or any other entity is not found.
        /// </summary>
        /// <param name="message">Exception Message</param>
        /// <param name="inner">Inner Exception</param>
        public BrowseCloudPageNotFoundException(string message, Exception inner)
            : base(message, inner)
        {
        }
    }
}
