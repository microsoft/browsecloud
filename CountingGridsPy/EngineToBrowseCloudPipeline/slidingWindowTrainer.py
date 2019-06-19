# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import numpy as np
import os


class SlidingWindowTrainer():
    @staticmethod
    def SlidingTrainer(w: int, s: int, training_max_iter_vec: list, train, kwargs: dict, runInitialTrain=True):
        '''
        Assume: data is sorted by date

        '''
        print("Learning Initial Grid.")
        pi = None
        if runInitialTrain:
            pi = train(**kwargs)
        assert("data" in kwargs and "max_iter" in kwargs and "output_directory" in kwargs)
        data = kwargs['data']
        root_dir = kwargs["output_directory"].replace(
            ".", "").replace("/", "").replace("\\", "")
        T = len(data)
        assert(w < T)
        max_sliding_window_size = int(np.ceil((T-w)/s) + 1)
        assert(len(training_max_iter_vec) == max_sliding_window_size)
        first_index = 0
        last_index = min(w, T)
        for i in range(max_sliding_window_size):
            kwargs['max_iter'] = training_max_iter_vec[i]
            kwargs['data'] = data[first_index:last_index]
            kwargs['output_directory'] = "./" + root_dir + "/iter" + str(i)
            kwargs['pi'] = pi

            if not (os.path.exists(kwargs['output_directory']) and os.path.isdir(kwargs['output_directory'])):
                os.mkdir(kwargs['output_directory'])

            print("Learning grid window from first index: " +
                  str(first_index) + " to second index: " + str(last_index))
            pi = train(**kwargs)

            last_index = min(last_index + s, T)
            first_index = min(first_index + s, T)
        assert(last_index >= T)
