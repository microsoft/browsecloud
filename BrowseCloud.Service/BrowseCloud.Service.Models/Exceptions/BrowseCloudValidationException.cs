// <copyright file="BrowseCloudValidationException.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Exceptions
{
    using System;

    /// <summary>
    /// Input data cannot be validated.
    /// </summary>
    public class BrowseCloudValidationException : BrowseCloudServiceException
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudValidationException"/> class.
        /// Input data cannot be validated.
        /// </summary>
        public BrowseCloudValidationException()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudValidationException"/> class.
        /// Input data cannot be validated.
        /// </summary>
        /// <param name="message">Exception Message</param>
        public BrowseCloudValidationException(string message)
            : base(message)
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudValidationException"/> class.
        /// Input data cannot be validated.
        /// </summary>
        /// <param name="message">Exception Message</param>
        /// <param name="inner">Inner Exception</param>
        public BrowseCloudValidationException(string message, Exception inner)
            : base(message, inner)
        {
        }
    }
}
