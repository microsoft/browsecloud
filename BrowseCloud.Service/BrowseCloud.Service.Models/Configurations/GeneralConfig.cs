// <copyright file="GeneralConfig.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Configurations
{
    /// <summary>
    /// Configuration items that don't fall under any particular service
    /// </summary>
    public class GeneralConfig
    {
        /// <summary>
        /// Commands to append to the beginning of any batch job command
        /// </summary>
        public string CommandPrefix { get; set; }

        /// <summary>
        /// Client IDs that are allowed full access to PUT jobs/{id}
        /// </summary>
        public string PutJobAuthorizedClientIds { get; set; }

        /// <summary>
        /// Allowed CORS Origins
        /// </summary>
        public string CorsOrigins { get; set; }
    }
}
